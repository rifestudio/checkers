import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Lightbulb,
  Flag,
  ChevronLeft,
  Crown,
  Undo2,
  Redo2,
  Loader2,
  Copy,
  Check,
  X,
  Bot,
  TrendingUp,
  Sparkles,
  Lock,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { deserializeBoard } from "@/lib/deserializeBoard";
import { serializeBoard } from "@/lib/serializeBoard";
import { useAuthStore } from "@/lib/authStore";
import {
  Cell,
  Piece,
  Player,
  createInitialBoard,
  getValidMoves,
  getMandatoryCaptures,
  shouldBecomeKing,
  getHintMove,
  rcToPos,
  posToRc,
} from "@/lib/gameLogic";
import {
  Difficulty,
  CompleteMove,
  AnalysisResult,
  MoveQuality,
  pickMove,
  analyzeMove,
  applyMove as applyAIMoveToBoard,
  parseDifficulty,
} from "@/lib/aiEngine";
import { AIExplanationResponse, requestAIExplanation } from "@/lib/asiAnalysis";

export type { Cell, Piece, Player } from "@/lib/gameLogic";
export { createInitialBoard } from "@/lib/gameLogic";

// ─── Touch detection ─────────────────────────────────────────────────────────
function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const check = () =>
      typeof window !== "undefined" &&
      ("ontouchstart" in window ||
        (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));
    setIsTouch(!!check());
  }, []);
  return isTouch;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type GamePhase = "waiting" | "playing" | "finished";

interface GameSnapshot {
  board: Cell[][];
  currentPlayer: Player;
  whiteCaptured: number;
  blackCaptured: number;
  lastMove: {
    from: { row: number; col: number };
    to: { row: number; col: number };
  } | null;
}

function createInitialSnapshot(): GameSnapshot {
  return {
    board: createInitialBoard(),
    currentPlayer: "white",
    whiteCaptured: 0,
    blackCaptured: 0,
    lastMove: null,
  };
}

interface MoveRow {
  id: number;
  game_id: string;
  player_id: string;
  from_position: number;
  to_position: number;
  captured_position: number | null;
  was_kinged: boolean;
  created_at: string;
}

function groupMovesIntoTurns(moves: MoveRow[]): CompleteMove[] {
  if (moves.length === 0) return [];

  const turns: CompleteMove[] = [];
  let currentSteps: CompleteMove["steps"] = [
    {
      from: posToRc(moves[0].from_position),
      to: posToRc(moves[0].to_position),
      capturedAt:
        moves[0].captured_position !== null
          ? posToRc(moves[0].captured_position)
          : null,
    },
  ];
  let prevPlayerId = moves[0].player_id;
  let prevToPosition = moves[0].to_position;

  for (let i = 1; i < moves.length; i++) {
    const m = moves[i];
    const continuesChain =
      m.player_id === prevPlayerId && m.from_position === prevToPosition;

    if (continuesChain) {
      currentSteps.push({
        from: posToRc(m.from_position),
        to: posToRc(m.to_position),
        capturedAt:
          m.captured_position !== null ? posToRc(m.captured_position) : null,
      });
    } else {
      turns.push({ steps: currentSteps });
      currentSteps = [
        {
          from: posToRc(m.from_position),
          to: posToRc(m.to_position),
          capturedAt:
            m.captured_position !== null ? posToRc(m.captured_position) : null,
        },
      ];
    }

    prevPlayerId = m.player_id;
    prevToPosition = m.to_position;
  }

  turns.push({ steps: currentSteps });
  return turns;
}

function reconstructSnapshots(turns: CompleteMove[]): GameSnapshot[] {
  const snapshots: GameSnapshot[] = [createInitialSnapshot()];
  let board = createInitialBoard();
  let currentPlayer: Player = "white";
  let whiteCaptured = 0;
  let blackCaptured = 0;

  for (const turn of turns) {
    if (turn.steps.length === 0) break;

    const startCell = board[turn.steps[0].from.row][turn.steps[0].from.col];
    if (!startCell.piece || startCell.piece.color !== currentPlayer) {
      console.warn("Snapshot reconstruction stopped: invalid turn", turn);
      break;
    }

    const newBoard = applyAIMoveToBoard(board, turn);
    const capturedThisTurn = turn.steps.filter(
      (s) => s.capturedAt !== null,
    ).length;
    if (currentPlayer === "white") whiteCaptured += capturedThisTurn;
    else blackCaptured += capturedThisTurn;

    const lastMove = {
      from: turn.steps[0].from,
      to: turn.steps[turn.steps.length - 1].to,
    };
    const nextPlayer: Player = currentPlayer === "white" ? "black" : "white";

    snapshots.push({
      board: newBoard,
      currentPlayer: nextPlayer,
      whiteCaptured,
      blackCaptured,
      lastMove,
    });

    board = newBoard;
    currentPlayer = nextPlayer;
  }

  return snapshots;
}

const QUALITY_STYLES: Record<
  MoveQuality,
  { label: string; text: string; bg: string; border: string }
> = {
  best: {
    label: "Best move",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  good: {
    label: "Good",
    text: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  inaccuracy: {
    label: "Inaccuracy",
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
  mistake: {
    label: "Mistake",
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
  blunder: {
    label: "Blunder",
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function CheckersBoard() {
  const params = useParams<{ inviteCode?: string; difficulty?: string }>();
  const isAIMode = !!params.difficulty;
  const difficulty: Difficulty = parseDifficulty(params.difficulty);
  const inviteCode = params.inviteCode;

  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const isTouch = useIsTouchDevice();
  const prefersReducedMotion = useReducedMotion();
  const lightAnimations = isTouch || !!prefersReducedMotion;

  const [gameRow, setGameRow] = useState<any>(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const [copied, setCopied] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  const [moveTurns, setMoveTurns] = useState<CompleteMove[]>([]);
  const [analysisCache, setAnalysisCache] = useState<
    Map<number, AnalysisResult>
  >(new Map());
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisAvailable, setAnalysisAvailable] = useState(false);

  // ── AI explanation state ──────────────────────────────────────────────────
  // Per-move cache of AI explanation responses. Each entry corresponds to a
  // historyIndex in analysis mode. Once requested, the result is sticky for
  // that move within the session — no auto-rerequest on navigation back.
  const [explanationCache, setExplanationCache] = useState<
    Map<number, AIExplanationResponse>
  >(new Map());
  const [explanationLoading, setExplanationLoading] = useState(false);

  const isFinishedRef = useRef(false);

  type Role = Player | "spectator";
  const playerSide: Role = isAIMode
    ? "white"
    : gameRow?.white_player === user?.id
      ? "white"
      : gameRow?.black_player === user?.id
        ? "black"
        : "spectator";

  const aiColor: Player = "black";

  const [board, setBoard] = useState<Cell[][]>([]);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player>("white");
  const [validMoves, setValidMoves] = useState<
    {
      row: number;
      col: number;
      isCapture: boolean;
      capturedPiece?: { row: number; col: number };
    }[]
  >([]);
  const [whiteCaptured, setWhiteCaptured] = useState(0);
  const [blackCaptured, setBlackCaptured] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>("waiting");
  const [winner, setWinner] = useState<Player | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [hint, setHint] = useState<{
    from: { row: number; col: number };
    to: { row: number; col: number };
  } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [lastMove, setLastMove] = useState<{
    from: { row: number; col: number };
    to: { row: number; col: number };
  } | null>(null);

  const [snapshots, setSnapshots] = useState<GameSnapshot[]>([
    createInitialSnapshot(),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isViewingHistory = historyIndex < snapshots.length - 1;

  const isSendingMove = useRef(false);

  const isFlipped = playerSide === "black";
  const displayBoard = isFlipped
    ? [...board].reverse().map((row) => [...row].reverse())
    : board;

  const toRealCoords = useCallback(
    (rowIndex: number, colIndex: number) =>
      isFlipped
        ? { row: 7 - rowIndex, col: 7 - colIndex }
        : { row: rowIndex, col: colIndex },
    [isFlipped],
  );

  useEffect(() => {
    if (isAIMode) {
      const initial = createInitialSnapshot();
      isFinishedRef.current = false;
      setBoard(initial.board);
      setCurrentPlayer("white");
      setWhiteCaptured(0);
      setBlackCaptured(0);
      setMoveCount(0);
      setWinner(null);
      setMoveHistory([]);
      setLastMove(null);
      setSnapshots([initial]);
      setHistoryIndex(0);
      setGamePhase("playing");
      setLoadingGame(false);
      return;
    }

    if (!inviteCode) return;

    async function load() {
      setLoadingGame(true);
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("invite_code", inviteCode)
        .single();

      if (error || !data) {
        console.error("Failed to load game:", error);
        setLoadingGame(false);
        return;
      }

      applyGameRow(data);

      if (data.status === "finished") {
        await loadMovesForAnalysis(data.id);
      }

      setLoadingGame(false);
    }

    load();
  }, [inviteCode, isAIMode, difficulty]);

  async function loadMovesForAnalysis(gameId: string) {
    const { data, error } = await supabase
      .from("moves")
      .select("*")
      .eq("game_id", gameId)
      .order("id", { ascending: true });

    if (error || !data || data.length === 0) {
      setAnalysisAvailable(false);
      return;
    }

    const turns = groupMovesIntoTurns(data as MoveRow[]);
    const reconstructed = reconstructSnapshots(turns);

    if (reconstructed.length === turns.length + 1) {
      setMoveTurns(turns);
      setSnapshots(reconstructed);
      setHistoryIndex(reconstructed.length - 1);
      setAnalysisAvailable(true);
    } else {
      console.warn(
        "Partial replay: snapshot reconstruction stopped early",
        reconstructed.length,
        turns.length + 1,
      );
      setAnalysisAvailable(false);
    }
  }

  useEffect(() => {
    if (!isAnalysisMode) return;
    if (!analysisAvailable) return;
    if (historyIndex === 0) return;
    if (analysisCache.has(historyIndex)) return;

    let cancelled = false;
    setAnalysisLoading(true);

    const timer = setTimeout(() => {
      if (cancelled) return;
      const prevSnapshot = snapshots[historyIndex - 1];
      const turn = moveTurns[historyIndex - 1];
      if (!prevSnapshot || !turn) {
        setAnalysisLoading(false);
        return;
      }

      const result = analyzeMove(
        prevSnapshot.board,
        turn,
        prevSnapshot.currentPlayer,
        4,
      );

      if (cancelled) return;
      setAnalysisCache((prev) => {
        const next = new Map(prev);
        next.set(historyIndex, result);
        return next;
      });
      setAnalysisLoading(false);
    }, 10);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    historyIndex,
    isAnalysisMode,
    analysisAvailable,
    moveTurns,
    snapshots,
    analysisCache,
  ]);

  useEffect(() => {
    if (!isAnalysisMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleUndo();
      if (e.key === "ArrowRight") handleRedo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalysisMode, snapshots.length, historyIndex]);

  useEffect(() => {
    if (isAIMode) return;
    if (!inviteCode) return;

    const channel = supabase
      .channel(`game:${inviteCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `invite_code=eq.${inviteCode}`,
        },
        (payload) => {
          if (isSendingMove.current) return;
          applyGameRow(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inviteCode, isAIMode]);

  useEffect(() => {
    if (isAIMode) return;
    if (!gameRow || !user) return;
    if (gameRow.status !== "waiting") return;
    if (gameRow.white_player === user.id) return;
    if (gameRow.black_player === user.id) return;
    if (gameRow.black_player !== null) return;
    if (gameRow.is_public === true) return;

    supabase
      .from("games")
      .update({ black_player: user.id, status: "playing" })
      .eq("invite_code", inviteCode)
      .then(({ error }) => {
        if (error) console.error("Failed to join game:", error);
      });
  }, [gameRow, user, inviteCode, isAIMode]);

  useEffect(() => {
    if (!isAIMode) return;
    if (gamePhase !== "playing") return;
    if (currentPlayer !== aiColor) return;
    if (isViewingHistory) return;
    if (!board.length) return;
    if (isFinishedRef.current) return;

    setAiThinking(true);

    const timer = setTimeout(() => {
      const move = pickMove(board, aiColor, difficulty);
      setAiThinking(false);

      if (!move) {
        isFinishedRef.current = true;
        setWinner("white");
        setGamePhase("finished");
        return;
      }
      applyAIMoveLocal(move);
    }, 500);

    return () => {
      clearTimeout(timer);
      setAiThinking(false);
    };
  }, [isAIMode, currentPlayer, gamePhase, board, isViewingHistory, difficulty]);

  function resolveWinner(row: any): Player | null {
    if (!row.winner) return null;
    if (row.winner === row.white_player) return "white";
    if (row.winner === row.black_player) return "black";
    return null;
  }

  function applyGameRow(row: any) {
    if (isFinishedRef.current && row.status !== "finished") {
      console.warn(
        "Ignoring game row update that would revert finished game",
        row,
      );
      return;
    }

    setGameRow(row);

    if (row.board) {
      setBoard(deserializeBoard(row.board));
    } else {
      setBoard(createInitialBoard());
    }

    const cp: Player = (row.current_turn as Player) ?? "white";
    setCurrentPlayer(cp);

    setWhiteCaptured(row.white_captured ?? 0);
    setBlackCaptured(row.black_captured ?? 0);
    setMoveCount(row.move_count ?? 0);

    if (row.last_move) setLastMove(row.last_move);

    if (row.status === "finished") {
      isFinishedRef.current = true;
      const w = resolveWinner(row);
      setWinner(w);
      setGamePhase("finished");
    } else if (row.status === "playing") {
      setGamePhase("playing");
    } else {
      setGamePhase("waiting");
    }

    setSelectedPiece(null);
    setValidMoves([]);
    setShowHint(false);
    setHint(null);

    if (row.status !== "finished") {
      const newSnapshot: GameSnapshot = {
        board: row.board ? deserializeBoard(row.board) : createInitialBoard(),
        currentPlayer: (row.current_turn as Player) ?? "white",
        whiteCaptured: row.white_captured ?? 0,
        blackCaptured: row.black_captured ?? 0,
        lastMove: row.last_move ?? null,
      };
      setSnapshots((prev) => {
        const next = [...prev, newSnapshot];
        setHistoryIndex(next.length - 1);
        return next;
      });
    }
  }

  async function refetchAndApply() {
    if (!inviteCode) return;
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();
    if (error || !data) return;
    isFinishedRef.current = false;
    applyGameRow(data);
  }

  async function insertMoveRow(args: {
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    capturedAt: { row: number; col: number } | null;
    wasKinged: boolean;
  }) {
    if (isAIMode) return;
    if (!gameRow || !user) return;

    const { error } = await supabase.from("moves").insert({
      game_id: gameRow.id,
      player_id: user.id,
      from_position: rcToPos(args.fromRow, args.fromCol),
      to_position: rcToPos(args.toRow, args.toCol),
      captured_position: args.capturedAt
        ? rcToPos(args.capturedAt.row, args.capturedAt.col)
        : null,
      was_kinged: args.wasKinged,
    });

    if (error) console.error("Failed to insert move row:", error);
  }

  async function pushMove(
    newBoard: Cell[][],
    nextPlayer: Player,
    newWhiteCaptured: number,
    newBlackCaptured: number,
    newMoveCount: number,
    newLastMove: {
      from: { row: number; col: number };
      to: { row: number; col: number };
    },
    winnerPlayer: Player | null,
  ) {
    if (isAIMode) return;
    if (!inviteCode || !gameRow) return;

    let winnerUuid: string | null = null;
    if (winnerPlayer === "white") winnerUuid = gameRow.white_player ?? null;
    if (winnerPlayer === "black") winnerUuid = gameRow.black_player ?? null;

    isSendingMove.current = true;

    const updatePayload: Record<string, any> = {
      board: serializeBoard(newBoard),
      current_turn: nextPlayer,
      white_captured: newWhiteCaptured,
      black_captured: newBlackCaptured,
      move_count: newMoveCount,
      last_move: newLastMove,
      status: winnerPlayer ? "finished" : "playing",
      winner: winnerUuid,
    };
    if (winnerPlayer) {
      updatePayload.ended_at = new Date().toISOString();
    }

    const { data: affected, error } = await supabase
      .from("games")
      .update(updatePayload)
      .eq("invite_code", inviteCode)
      .eq("status", "playing")
      .select();

    setTimeout(() => {
      isSendingMove.current = false;
    }, 300);

    if (error) {
      console.error("Failed to push move:", error);
      return;
    }

    if (!affected || affected.length === 0) {
      console.warn(
        "Move rejected: game already finished. Resyncing from server.",
      );
      await refetchAndApply();
      return;
    }

    if (winnerPlayer && winnerUuid) {
      const loserUuid =
        winnerPlayer === "white" ? gameRow.black_player : gameRow.white_player;
      await updateProfiles(winnerUuid, loserUuid);
    }
  }

  async function updateProfiles(winnerUuid: string, loserUuid: string | null) {
    if (isAIMode) return;
    await supabase.rpc("increment_profile_win", { user_id: winnerUuid });
    if (loserUuid) {
      await supabase.rpc("increment_profile_loss", { user_id: loserUuid });
    }
  }

  useEffect(() => {
    if (!board.length) return;
    let blackCount = 0,
      whiteCount = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c].piece;
        if (p?.color === "black") blackCount++;
        if (p?.color === "white") whiteCount++;
      }
    if (blackCount === 0 && gamePhase === "playing") {
      isFinishedRef.current = true;
      setWinner("white");
      setGamePhase("finished");
    } else if (whiteCount === 0 && gamePhase === "playing") {
      isFinishedRef.current = true;
      setWinner("black");
      setGamePhase("finished");
    }
  }, [board]);

  function applyAIMoveLocal(move: CompleteMove) {
    if (move.steps.length === 0) return;

    const newBoard = applyAIMoveToBoard(board, move);
    const firstStep = move.steps[0];
    const lastStep = move.steps[move.steps.length - 1];
    const capturedThisTurn = move.steps.filter(
      (s) => s.capturedAt !== null,
    ).length;

    const newBlackCaptured = blackCaptured + capturedThisTurn;
    const newLastMove = {
      from: firstStep.from,
      to: lastStep.to,
    };
    const newMoveCount = moveCount + 1;

    let blackCount = 0,
      whiteCount = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = newBoard[r][c].piece;
        if (p?.color === "black") blackCount++;
        if (p?.color === "white") whiteCount++;
      }
    const winnerNow: Player | null =
      blackCount === 0 ? "white" : whiteCount === 0 ? "black" : null;

    setBoard(newBoard);
    setBlackCaptured(newBlackCaptured);
    setCurrentPlayer("white");
    setLastMove(newLastMove);
    setMoveCount(newMoveCount);
    setMoveHistory((prev) => [
      ...prev,
      `AI: (${firstStep.from.row},${firstStep.from.col}) → (${lastStep.to.row},${lastStep.to.col})${capturedThisTurn > 1 ? ` ×${capturedThisTurn}` : ""}`,
    ]);

    if (winnerNow) {
      isFinishedRef.current = true;
      setWinner(winnerNow);
      setGamePhase("finished");
    }

    const newSnapshot: GameSnapshot = {
      board: newBoard,
      currentPlayer: "white",
      whiteCaptured,
      blackCaptured: newBlackCaptured,
      lastMove: newLastMove,
    };
    setSnapshots((prev) => [...prev.slice(0, historyIndex + 1), newSnapshot]);
    setHistoryIndex((prev) => prev + 1);
  }

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (gamePhase !== "playing") return;
      if (isViewingHistory) return;
      if (playerSide === "spectator") return;
      if (currentPlayer !== playerSide) return;

      const cell = board[row][col];

      const validMove = validMoves.find((m) => m.row === row && m.col === col);
      if (validMove && selectedPiece) {
        const newBoard = board.map((r) =>
          r.map((c) => ({ ...c, piece: c.piece ? { ...c.piece } : null })),
        );

        const wasKingBefore = selectedPiece.isKing;

        newBoard[selectedPiece.row][selectedPiece.col].piece = null;
        const movedPiece: Piece = {
          ...selectedPiece,
          row,
          col,
          isKing:
            selectedPiece.isKing || shouldBecomeKing({ ...selectedPiece, row }),
        };
        newBoard[row][col].piece = movedPiece;

        const wasKinged = !wasKingBefore && movedPiece.isKing;

        let newWhiteCaptured = whiteCaptured;
        let newBlackCaptured = blackCaptured;

        const newLastMove = {
          from: { row: selectedPiece.row, col: selectedPiece.col },
          to: { row, col },
        };

        if (validMove.isCapture && validMove.capturedPiece) {
          newBoard[validMove.capturedPiece.row][
            validMove.capturedPiece.col
          ].piece = null;
          if (currentPlayer === "white") {
            newWhiteCaptured += 1;
            setWhiteCaptured(newWhiteCaptured);
          } else {
            newBlackCaptured += 1;
            setBlackCaptured(newBlackCaptured);
          }

          insertMoveRow({
            fromRow: selectedPiece.row,
            fromCol: selectedPiece.col,
            toRow: row,
            toCol: col,
            capturedAt: validMove.capturedPiece,
            wasKinged,
          });

          const furtherCaptures = getValidMoves(newBoard, movedPiece).filter(
            (m) => m.isCapture,
          );
          if (furtherCaptures.length > 0) {
            setBoard(newBoard);
            setSelectedPiece(movedPiece);
            setValidMoves(furtherCaptures);
            setWhiteCaptured(newWhiteCaptured);
            setBlackCaptured(newBlackCaptured);
            setLastMove(newLastMove);
            return;
          }
        } else {
          insertMoveRow({
            fromRow: selectedPiece.row,
            fromCol: selectedPiece.col,
            toRow: row,
            toCol: col,
            capturedAt: null,
            wasKinged,
          });
        }

        const nextPlayer: Player =
          currentPlayer === "white" ? "black" : "white";
        const newMoveCount = moveCount + 1;

        let blackCount = 0,
          whiteCount = 0;
        for (let r = 0; r < 8; r++)
          for (let c = 0; c < 8; c++) {
            const p = newBoard[r][c].piece;
            if (p?.color === "black") blackCount++;
            if (p?.color === "white") whiteCount++;
          }
        const winnerNow: Player | null =
          blackCount === 0 ? "white" : whiteCount === 0 ? "black" : null;

        setBoard(newBoard);
        setSelectedPiece(null);
        setValidMoves([]);
        setCurrentPlayer(nextPlayer);
        setLastMove(newLastMove);
        setMoveCount(newMoveCount);
        setMoveHistory((prev) => [
          ...prev,
          `${currentPlayer}: (${selectedPiece.row},${selectedPiece.col}) → (${row},${col})`,
        ]);
        setShowHint(false);
        setHint(null);

        const newSnapshot: GameSnapshot = {
          board: newBoard,
          currentPlayer: nextPlayer,
          whiteCaptured: newWhiteCaptured,
          blackCaptured: newBlackCaptured,
          lastMove: newLastMove,
        };
        setSnapshots((prev) => [
          ...prev.slice(0, historyIndex + 1),
          newSnapshot,
        ]);
        setHistoryIndex((prev) => prev + 1);

        pushMove(
          newBoard,
          nextPlayer,
          newWhiteCaptured,
          newBlackCaptured,
          newMoveCount,
          newLastMove,
          winnerNow,
        );
        return;
      }

      if (cell.piece && cell.piece.color === currentPlayer) {
        const mandatory = getMandatoryCaptures(board, currentPlayer);
        if (mandatory.length > 0) {
          const canThisPieceCapture = mandatory.some(
            (m) =>
              m.piece.row === cell.piece!.row &&
              m.piece.col === cell.piece!.col,
          );
          if (!canThisPieceCapture) return;

          setSelectedPiece(cell.piece);
          setValidMoves(
            mandatory
              .filter(
                (m) =>
                  m.piece.row === cell.piece!.row &&
                  m.piece.col === cell.piece!.col,
              )
              .map((m) => m.move),
          );
        } else {
          setSelectedPiece(cell.piece);
          setValidMoves(getValidMoves(board, cell.piece));
        }
        setShowHint(false);
        setHint(null);
        return;
      }

      setSelectedPiece(null);
      setValidMoves([]);
    },
    [
      board,
      selectedPiece,
      validMoves,
      currentPlayer,
      playerSide,
      gamePhase,
      whiteCaptured,
      blackCaptured,
      moveCount,
      historyIndex,
      isViewingHistory,
      gameRow,
      isAIMode,
    ],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    const s = snapshots[idx];
    setHistoryIndex(idx);
    setBoard(s.board);
    setCurrentPlayer(s.currentPlayer);
    setWhiteCaptured(s.whiteCaptured);
    setBlackCaptured(s.blackCaptured);
    setLastMove(s.lastMove);
    setSelectedPiece(null);
    setValidMoves([]);
    setShowHint(false);
    setHint(null);
  }, [historyIndex, snapshots]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= snapshots.length - 1) return;
    const idx = historyIndex + 1;
    const s = snapshots[idx];
    setHistoryIndex(idx);
    setBoard(s.board);
    setCurrentPlayer(s.currentPlayer);
    setWhiteCaptured(s.whiteCaptured);
    setBlackCaptured(s.blackCaptured);
    setLastMove(s.lastMove);
    setSelectedPiece(null);
    setValidMoves([]);
    setShowHint(false);
    setHint(null);
  }, [historyIndex, snapshots]);

  const handleHint = useCallback(() => {
    if (isViewingHistory || currentPlayer !== playerSide) return;
    const h = getHintMove(board, currentPlayer);
    if (h) {
      setHint(h);
      setShowHint(true);
      setSelectedPiece(null);
      setValidMoves([]);
      setTimeout(() => {
        setShowHint(false);
        setHint(null);
      }, 3000);
    }
  }, [board, currentPlayer, playerSide, isViewingHistory]);

  const handleReset = useCallback(() => {
    const initial = createInitialSnapshot();
    isFinishedRef.current = false;
    setBoard(initial.board);
    setSelectedPiece(null);
    setCurrentPlayer("white");
    setValidMoves([]);
    setWhiteCaptured(0);
    setBlackCaptured(0);
    setMoveCount(0);
    setGamePhase("playing");
    setWinner(null);
    setMoveHistory([]);
    setHint(null);
    setShowHint(false);
    setLastMove(null);
    setSnapshots([initial]);
    setHistoryIndex(0);
  }, []);

  const handleResign = useCallback(async () => {
    if (playerSide === "spectator") return;

    const w: Player = playerSide === "white" ? "black" : "white";

    isFinishedRef.current = true;
    setWinner(w);
    setGamePhase("finished");

    if (isAIMode) return;
    if (!gameRow || !inviteCode) return;

    const winnerUuid =
      w === "white" ? gameRow.white_player : gameRow.black_player;
    const loserUuid =
      w === "white" ? gameRow.black_player : gameRow.white_player;

    const { data: affected, error } = await supabase
      .from("games")
      .update({
        status: "finished",
        winner: winnerUuid,
        ended_at: new Date().toISOString(),
      })
      .eq("invite_code", inviteCode)
      .eq("status", "playing")
      .select();

    if (error) {
      console.error("Failed to resign:", error);
      return;
    }

    if (!affected || affected.length === 0) {
      await refetchAndApply();
      return;
    }

    if (winnerUuid) {
      await updateProfiles(winnerUuid, loserUuid);
    }
  }, [playerSide, inviteCode, gameRow, isAIMode]);

  const handleCancelMatching = useCallback(async () => {
    if (!inviteCode || !gameRow) return;
    if (gameRow.white_player !== user?.id) return;
    if (gameRow.black_player !== null) return;

    const { error } = await supabase
      .from("games")
      .delete()
      .eq("invite_code", inviteCode);

    if (error) {
      console.error("Failed to cancel matchmaking:", error);
      return;
    }
    navigate("/menu");
  }, [inviteCode, gameRow, user, navigate]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnterAnalysis = () => {
    setIsAnalysisMode(true);
    setHistoryIndex(0);
    const s = snapshots[0];
    if (s) {
      setBoard(s.board);
      setCurrentPlayer(s.currentPlayer);
      setWhiteCaptured(s.whiteCaptured);
      setBlackCaptured(s.blackCaptured);
      setLastMove(s.lastMove);
    }
  };

  const handleExitAnalysis = () => {
    setIsAnalysisMode(false);
    const last = snapshots.length - 1;
    setHistoryIndex(last);
    const s = snapshots[last];
    if (s) {
      setBoard(s.board);
      setCurrentPlayer(s.currentPlayer);
      setWhiteCaptured(s.whiteCaptured);
      setBlackCaptured(s.blackCaptured);
      setLastMove(s.lastMove);
    }
  };

  // ── Request AI explanation for the current move ──────────────────────────
  // Reads from the local analysis result (already computed) + reconstructed
  // prev-board, sends to the Edge Function. Caches result per historyIndex.
  const handleRequestExplanation = useCallback(async () => {
    if (!isAnalysisMode) return;
    if (historyIndex === 0) return;
    if (explanationLoading) return;
    if (explanationCache.has(historyIndex)) return;

    const analysis = analysisCache.get(historyIndex);
    if (!analysis) return;

    const prevSnapshot = snapshots[historyIndex - 1];
    const turn = moveTurns[historyIndex - 1];
    if (!prevSnapshot || !turn) return;

    setExplanationLoading(true);
    const result = await requestAIExplanation({
      board: prevSnapshot.board,
      analysis,
      actualMoveSteps: turn.steps as any,
      sideToMove: prevSnapshot.currentPlayer,
      moveNumber: historyIndex,
    });
    setExplanationCache((prev) => {
      const next = new Map(prev);
      next.set(historyIndex, result);
      return next;
    });
    setExplanationLoading(false);
  }, [
    isAnalysisMode,
    historyIndex,
    explanationLoading,
    explanationCache,
    analysisCache,
    snapshots,
    moveTurns,
  ]);

  const totalCaptured = whiteCaptured + blackCaptured;
  const isPublicRoom = !isAIMode && gameRow?.is_public === true;
  const difficultyLabel =
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  const currentAnalysis: AnalysisResult | undefined =
    isAnalysisMode && historyIndex > 0
      ? analysisCache.get(historyIndex)
      : undefined;
  const currentExplanation: AIExplanationResponse | undefined = isAnalysisMode
    ? explanationCache.get(historyIndex)
    : undefined;

  const bestMoveHighlight =
    isAnalysisMode && currentAnalysis?.bestMove
      ? {
          from: currentAnalysis.bestMove.steps[0].from,
          to: currentAnalysis.bestMove.steps[
            currentAnalysis.bestMove.steps.length - 1
          ].to,
        }
      : null;

  function renderNavControls(extraClass: string = "") {
    return (
      <div className={`flex gap-2 ${extraClass}`}>
        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
            border border-white/5 bg-white/[0.02] text-white/50
            hover:bg-white/[0.06] hover:text-white/80
            disabled:opacity-20 disabled:cursor-not-allowed transition-colors duration-200 text-sm font-semibold"
        >
          <Undo2 className="w-4 h-4" /> {isAnalysisMode ? "Prev" : "Undo"}
        </button>
        <button
          onClick={handleRedo}
          disabled={historyIndex >= snapshots.length - 1}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
            border border-white/5 bg-white/[0.02] text-white/50
            hover:bg-white/[0.06] hover:text-white/80
            disabled:opacity-20 disabled:cursor-not-allowed transition-colors duration-200 text-sm font-semibold"
        >
          <Redo2 className="w-4 h-4" /> {isAnalysisMode ? "Next" : "Redo"}
        </button>
      </div>
    );
  }

  // ── Render the AI explanation block in analysis card ──────────────────────
  function renderAIExplanationBlock() {
    // Disabled if we don't have engine analysis yet for this move.
    if (!currentAnalysis) return null;

    if (currentExplanation?.kind === "ok") {
      return (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-blue-400 text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> AI explanation
          </div>
          <div className="max-h-32 overflow-y-auto pr-1">
            <p className="text-sm text-white/70 leading-relaxed">
              {currentExplanation.explanation.replace(/\n+/g, " ").trim()}
            </p>
          </div>
        </div>
      );
    }

    if (currentExplanation?.kind === "error") {
      if (currentExplanation.reason === "quota_exceeded") {
        return (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Lock className="w-3.5 h-3.5" />
              Daily free limit reached
            </div>
            <Link
              to="/pricing"
              className="block w-full text-center px-3 py-2.5 rounded-lg
                border border-orange-500/20 bg-orange-500/10 text-orange-400 hover:bg-orange-500/15
                transition-colors text-xs font-bold tracking-wider"
            >
              UPGRADE TO PRO — $7/MO
            </Link>
            <p className="text-xs text-white/30">
              Unlimited AI explanations with Pro.
            </p>
          </div>
        );
      }
      return (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-xs text-red-400/80">
            Could not get explanation. Try again later.
          </p>
          <button
            onClick={handleRequestExplanation}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="mt-3 pt-3 border-t border-white/5">
        <button
          onClick={handleRequestExplanation}
          disabled={explanationLoading || analysisLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
            border border-blue-500/20 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors text-xs font-semibold"
        >
          {explanationLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Getting
              explanation…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> Explain with AI
            </>
          )}
        </button>
        <p className="text-xs text-white/30 mt-1.5 text-center">
          1 free per day · Pro for unlimited
        </p>
      </div>
    );
  }

  if (loadingGame) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="text-white/40 font-orbitron text-sm tracking-wider">
            Loading game…
          </p>
        </div>
      </div>
    );
  }

  const pieceTransition = lightAnimations
    ? { duration: 0.12, ease: "easeOut" as const }
    : { type: "spring" as const, stiffness: 300, damping: 20 };

  return (
    <div className="relative min-h-screen bg-[#080808] overflow-hidden flex flex-col">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      {!lightAnimations && (
        <>
          <div className="absolute inset-0 noise-overlay" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/3 rounded-full blur-3xl" />
        </>
      )}

      <motion.header
        className="relative z-10 flex items-center justify-between px-6 lg:px-12 h-16 border-b border-white/5"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          to="/menu"
          className="flex items-center gap-2 text-white/40 hover:text-orange-500 transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <Crown className="w-5 h-5" />
          <span className="font-orbitron text-sm font-bold tracking-wider">
            TEMPO
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-600" />
            <span className="text-sm text-white/40">{blackCaptured}</span>
          </div>
          <div
            className={`px-4 py-1.5 rounded-full border ${
              isAnalysisMode
                ? "border-blue-500/30 bg-blue-500/5"
                : "border-orange-500/20 bg-orange-500/5"
            }`}
          >
            <span
              className={`text-sm font-orbitron font-bold ${
                isAnalysisMode ? "text-blue-400" : "text-orange-500"
              }`}
            >
              {isAnalysisMode
                ? `Analysis · Move ${historyIndex} / ${snapshots.length - 1}`
                : gamePhase === "waiting"
                  ? isPublicRoom
                    ? "Searching for opponent…"
                    : "Waiting for opponent…"
                  : isViewingHistory
                    ? `Move ${historyIndex} / ${snapshots.length - 1}`
                    : playerSide === "spectator"
                      ? `${currentPlayer === "white" ? "White" : "Black"}'s Turn`
                      : currentPlayer === playerSide
                        ? "Your Turn"
                        : isAIMode
                          ? aiThinking
                            ? "Computer thinking…"
                            : "Computer's Turn"
                          : "Opponent's Turn"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/40">{whiteCaptured}</span>
            <div className="w-3 h-3 rounded-full bg-orange-500 border border-orange-400" />
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {gamePhase === "waiting" && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="p-8 rounded-2xl border border-white/10 bg-[#0a0a0a] max-w-sm w-full mx-4 text-center space-y-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
              <div>
                <h2 className="font-orbitron text-xl font-bold text-white mb-2">
                  {isPublicRoom
                    ? "Searching for opponent"
                    : "Waiting for opponent"}
                </h2>
                <p className="text-sm text-white/40">
                  {isPublicRoom
                    ? "We'll start the game as soon as someone joins"
                    : "Share the link below to invite your friend"}
                </p>
              </div>

              {!isPublicRoom && (
                <>
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                      border border-orange-500/20 bg-orange-500/5 text-orange-400 hover:bg-orange-500/10
                      transition-colors duration-200 text-sm font-semibold"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? "Link copied!" : "Copy invite link"}
                  </button>
                  <p className="text-xs text-white/20 font-mono break-all">
                    {window.location.href}
                  </p>
                </>
              )}

              {isPublicRoom && playerSide === "white" && (
                <button
                  onClick={handleCancelMatching}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10
                    transition-colors duration-200 text-sm font-semibold"
                >
                  <X className="w-4 h-4" />
                  Cancel matchmaking
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-12 w-full max-w-5xl">
          <div className="relative flex flex-col items-center gap-3 lg:gap-0 w-full lg:w-auto">
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <AnimatePresence>
                {isViewingHistory && !isAnalysisMode && (
                  <motion.div
                    className="absolute -top-10 left-0 right-0 flex justify-center z-10"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                  >
                    <div className="px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-sm">
                      <span className="text-yellow-400 text-xs font-semibold tracking-wide">
                        Reviewing history — moves are locked
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className={
                  lightAnimations
                    ? "relative p-2 rounded-2xl bg-white/[0.04] border border-white/10"
                    : "relative p-3 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 shadow-2xl"
                }
              >
                <div
                  className="grid grid-cols-8 gap-0 rounded-xl overflow-hidden border border-white/5"
                  style={{
                    width: "min(92vw, 600px)",
                    height: "min(92vw, 600px)",
                  }}
                >
                  {displayBoard.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                      const { row: realRow, col: realCol } = toRealCoords(
                        rowIndex,
                        colIndex,
                      );

                      const isSelected =
                        selectedPiece?.row === realRow &&
                        selectedPiece?.col === realCol;
                      const isValidMoveCell = validMoves.some(
                        (m) => m.row === realRow && m.col === realCol,
                      );
                      const isHintFrom =
                        showHint &&
                        hint?.from.row === realRow &&
                        hint?.from.col === realCol;
                      const isHintTo =
                        showHint &&
                        hint?.to.row === realRow &&
                        hint?.to.col === realCol;
                      const isLastMoveFrom =
                        lastMove?.from.row === realRow &&
                        lastMove?.from.col === realCol;
                      const isLastMoveTo =
                        lastMove?.to.row === realRow &&
                        lastMove?.to.col === realCol;
                      const isMyTurn =
                        currentPlayer === playerSide && gamePhase === "playing";

                      const isBestFrom =
                        !!bestMoveHighlight &&
                        bestMoveHighlight.from.row === realRow &&
                        bestMoveHighlight.from.col === realCol;
                      const isBestTo =
                        !!bestMoveHighlight &&
                        bestMoveHighlight.to.row === realRow &&
                        bestMoveHighlight.to.col === realCol;

                      const CellWrapper: any = lightAnimations
                        ? "div"
                        : motion.div;
                      const cellMotionProps = lightAnimations
                        ? {}
                        : {
                            whileHover:
                              cell.isDark && isMyTurn && !isViewingHistory
                                ? { scale: 0.95 }
                                : {},
                            transition: { duration: 0.1 },
                          };

                      return (
                        <CellWrapper
                          key={`${rowIndex}-${colIndex}`}
                          className={`relative flex items-center justify-center
                            ${cell.isDark ? "bg-[#1a1a1a]" : "bg-[#2a2a2a]"}
                            ${isSelected ? "ring-2 ring-orange-500 ring-inset" : ""}
                            ${isValidMoveCell ? "ring-2 ring-green-500/50 ring-inset" : ""}
                            ${isHintFrom ? "ring-2 ring-yellow-500 ring-inset" : ""}
                            ${isHintTo ? "ring-2 ring-yellow-500 ring-inset" : ""}
                            ${isLastMoveFrom ? "bg-orange-500/10" : ""}
                            ${isLastMoveTo ? "bg-orange-500/20" : ""}
                            ${isBestFrom ? "ring-2 ring-blue-400 ring-inset" : ""}
                            ${isBestTo ? "ring-2 ring-blue-400 ring-inset" : ""}
                            ${isMyTurn && cell.isDark && !isAnalysisMode ? "cursor-pointer" : "cursor-default"}
                            ${isViewingHistory ? "cursor-default" : ""}
                          `}
                          style={{ aspectRatio: "1" }}
                          onClick={() => handleCellClick(realRow, realCol)}
                          {...cellMotionProps}
                        >
                          {isValidMoveCell && !cell.piece && (
                            <motion.div
                              className="absolute w-3 h-3 rounded-full bg-green-500/40"
                              initial={{ scale: 0 }}
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                          )}
                          {isHintTo && (
                            <motion.div
                              className="absolute w-4 h-4 rounded-full bg-yellow-500/60"
                              initial={{ scale: 0 }}
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{
                                duration: 0.5,
                                repeat: Infinity,
                              }}
                            />
                          )}
                          {isBestTo && !cell.piece && (
                            <motion.div
                              className="absolute w-4 h-4 rounded-full bg-blue-400/50"
                              initial={{ scale: 0 }}
                              animate={{ scale: [1, 1.25, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                          )}
                          <AnimatePresence>
                            {cell.piece && (
                              <motion.div
                                className={`w-[75%] h-[75%] rounded-full flex items-center justify-center relative
                                  ${
                                    cell.piece.color === "black"
                                      ? lightAnimations
                                        ? "bg-zinc-800 border border-zinc-700"
                                        : "bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-lg shadow-black/50"
                                      : lightAnimations
                                        ? "bg-orange-500 border border-orange-400"
                                        : "bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30"
                                  }
                                  ${isSelected ? "scale-110" : ""}
                                `}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                  scale: isSelected ? 1.1 : 1,
                                  opacity: 1,
                                }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={pieceTransition}
                              >
                                <div
                                  className={`w-[70%] h-[70%] rounded-full border-2 ${
                                    cell.piece.color === "black"
                                      ? "border-zinc-600"
                                      : "border-orange-300"
                                  }`}
                                />
                                {cell.piece.isKing && (
                                  <div className="absolute -top-1">
                                    <Crown
                                      className={`w-4 h-4 ${cell.piece.color === "black" ? "text-yellow-500" : "text-yellow-300"}`}
                                    />
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CellWrapper>
                      );
                    }),
                  )}
                </div>
              </div>
              {!lightAnimations && (
                <div className="absolute -inset-4 bg-orange-500/5 blur-3xl rounded-full -z-10" />
              )}
            </motion.div>

            <div className="w-full lg:hidden">{renderNavControls()}</div>
          </div>

          <motion.div
            className="w-full lg:w-64 space-y-4"
            initial={{ opacity: 0, x: lightAnimations ? 0 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {isAnalysisMode && (
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-orbitron text-sm font-bold text-blue-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Analysis
                  </h3>
                  <button
                    onClick={handleExitAnalysis}
                    className="text-xs text-white/40 hover:text-white/80 transition-colors"
                  >
                    Exit
                  </button>
                </div>

                {historyIndex === 0 ? (
                  <p className="text-xs text-white/40">
                    Use → to step forward through the game.
                  </p>
                ) : analysisLoading ? (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Loader2 className="w-3 h-3 animate-spin" /> Analyzing…
                  </div>
                ) : currentAnalysis ? (
                  <div className="space-y-3">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${QUALITY_STYLES[currentAnalysis.quality].bg} ${QUALITY_STYLES[currentAnalysis.quality].border} ${QUALITY_STYLES[currentAnalysis.quality].text}`}
                    >
                      {QUALITY_STYLES[currentAnalysis.quality].label}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-white/40">
                        <span>Your move</span>
                        <span className="font-mono text-white/70">
                          {currentAnalysis.actualScore.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between text-white/40">
                        <span>Best move</span>
                        <span className="font-mono text-blue-300">
                          {currentAnalysis.bestScore.toFixed(1)}
                        </span>
                      </div>
                      {!currentAnalysis.isBestMove && (
                        <div className="flex justify-between text-white/40 pt-1 border-t border-white/5">
                          <span>Loss</span>
                          <span className="font-mono text-orange-300">
                            −{currentAnalysis.scoreLoss.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    {currentAnalysis.bestMove &&
                      !currentAnalysis.isBestMove && (
                        <div className="text-xs text-white/40 pt-1 border-t border-white/5">
                          <div className="text-blue-400 font-semibold mb-1">
                            Engine suggests
                          </div>
                          <div className="font-mono text-white/60">
                            ({currentAnalysis.bestMove.steps[0].from.row + 1},
                            {currentAnalysis.bestMove.steps[0].from.col + 1})
                            {" → "}(
                            {currentAnalysis.bestMove.steps[
                              currentAnalysis.bestMove.steps.length - 1
                            ].to.row + 1}
                            ,
                            {currentAnalysis.bestMove.steps[
                              currentAnalysis.bestMove.steps.length - 1
                            ].to.col + 1}
                            )
                            {currentAnalysis.bestMove.steps.length > 1 &&
                              ` · ${currentAnalysis.bestMove.steps.length} jumps`}
                          </div>
                        </div>
                      )}

                    {/* AI explanation block — button to request, or text once loaded */}
                    {renderAIExplanationBlock()}
                  </div>
                ) : null}
                <p className="text-xs text-white/30 mt-3">
                  Use ← → to navigate
                </p>
              </div>
            )}

            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="font-orbitron text-sm font-bold text-white/60 mb-3">
                Game Status
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Turn</span>
                  <span
                    className={
                      playerSide !== "spectator" && currentPlayer === playerSide
                        ? "text-orange-500"
                        : "text-zinc-400"
                    }
                  >
                    {playerSide === "spectator"
                      ? currentPlayer === "white"
                        ? "White"
                        : "Black"
                      : currentPlayer === playerSide
                        ? "You"
                        : isAIMode
                          ? "Computer"
                          : "Opponent"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Moves</span>
                  <span className="text-white">{moveCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Captured</span>
                  <span className="text-white">{totalCaptured}</span>
                </div>
                {isAIMode ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Opponent</span>
                    <span className="text-white inline-flex items-center gap-1">
                      <Bot className="w-3 h-3" /> {difficultyLabel}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Your side</span>
                    <span className="text-white capitalize">
                      {playerSide === "spectator"
                        ? "spectator"
                        : playerSide === "white"
                          ? "white (orange)"
                          : "black"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {playerSide === "white" &&
              gamePhase !== "finished" &&
              !isPublicRoom &&
              !isAIMode && (
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <h3 className="font-orbitron text-sm font-bold text-white/60 mb-3">
                    Invite Link
                  </h3>
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                    border border-orange-500/20 bg-orange-500/5 text-orange-400 hover:bg-orange-500/10
                    transition-colors duration-200 text-xs font-semibold"
                  >
                    {copied ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copied ? "Copied!" : "Copy invite link"}
                  </button>
                </div>
              )}

            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="font-orbitron text-sm font-bold text-white/60 mb-3">
                Last Moves
              </h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {moveHistory.slice(-5).map((move, i) => (
                  <div key={i} className="text-xs text-white/30 font-mono">
                    {move}
                  </div>
                ))}
                {moveHistory.length === 0 && (
                  <div className="text-xs text-white/20">No moves yet</div>
                )}
              </div>
            </div>

            <div className="hidden lg:block">{renderNavControls()}</div>

            {playerSide !== "spectator" && !isAnalysisMode && (
              <div className="space-y-2">
                <button
                  onClick={handleHint}
                  disabled={isViewingHistory || currentPlayer !== playerSide}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  border border-orange-500/20 bg-orange-500/5 text-orange-500
                  hover:bg-orange-500/10 hover:border-orange-500/30
                  disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 font-semibold text-sm"
                >
                  <Lightbulb className="w-4 h-4" /> Get Hint
                </button>
                <button
                  onClick={handleResign}
                  disabled={isViewingHistory || gamePhase !== "playing"}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  border border-red-500/10 bg-red-500/5 text-red-400
                  hover:bg-red-500/10 hover:border-red-500/20
                  disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 text-sm"
                >
                  <Flag className="w-4 h-4" /> Resign
                </button>
              </div>
            )}

            {gamePhase === "finished" &&
              !isAnalysisMode &&
              analysisAvailable && (
                <button
                  onClick={handleEnterAnalysis}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  border border-blue-500/20 bg-blue-500/5 text-blue-400
                  hover:bg-blue-500/10 hover:border-blue-500/30
                  transition-colors duration-200 font-semibold text-sm"
                >
                  <TrendingUp className="w-4 h-4" /> Analyze Game
                </button>
              )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showHint && hint && (
          <motion.div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="px-6 py-3 rounded-full border border-yellow-500/20 bg-yellow-500/10 backdrop-blur-sm flex items-center gap-3 shadow-lg shadow-yellow-500/10">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <span className="text-yellow-400 font-semibold text-sm">
                Suggested: ({hint.from.row + 1},{hint.from.col + 1}) → (
                {hint.to.row + 1},{hint.to.col + 1})
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gamePhase === "finished" && winner && !isAnalysisMode && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative p-8 rounded-2xl border border-white/10 bg-[#0a0a0a] max-w-md w-full mx-4 text-center"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={
                lightAnimations
                  ? { duration: 0.2 }
                  : { type: "spring", stiffness: 200, damping: 20 }
              }
            >
              <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center mx-auto mb-6">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <h2 className="font-orbitron text-3xl font-bold text-white mb-2">
                Game Over
              </h2>
              <p className="text-lg text-white/60 mb-2">
                {winner === playerSide ? "🎉 You Win!" : "You Lost"}
              </p>
              <p className="text-sm text-white/40 mb-8">
                Total moves: {moveCount}
                {isAIMode && (
                  <>
                    {" "}
                    · vs <span className="capitalize">{difficulty}</span> AI
                  </>
                )}
              </p>
              <div className="flex gap-3 flex-wrap">
                {analysisAvailable && !isAIMode && (
                  <button
                    onClick={handleEnterAnalysis}
                    className="flex-1 min-w-[120px] px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 font-semibold hover:bg-blue-500/15 transition-colors flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" /> Analyze
                  </button>
                )}

                <Link
                  to="/menu"
                  className="flex-1 min-w-[120px] px-4 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors text-center"
                >
                  Menu
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
