// ────────────────────────────────────────────────────────────────────────────
// aiEngine.ts
// Local checkers AI — minimax with alpha-beta pruning. Used both as the
// gameplay opponent and as the move-quality analyzer in post-game review.
// ────────────────────────────────────────────────────────────────────────────

import {
  Cell,
  Piece,
  Player,
  getValidMoves,
  shouldBecomeKing,
  cloneBoard,
} from "./gameLogic";

export type Difficulty =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "grandmaster";

export interface MoveStep {
  from: { row: number; col: number };
  to: { row: number; col: number };
  capturedAt: { row: number; col: number } | null;
}

export interface CompleteMove {
  steps: MoveStep[];
}

// ─── Move quality classification (for analysis) ─────────────────────────────
export type MoveQuality =
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface AnalysisResult {
  // The move the engine would play in the given position.
  bestMove: CompleteMove | null;
  // Evaluation of the position after the best move, from sideToMove's POV.
  bestScore: number;
  // Evaluation of the position after the actual move, from sideToMove's POV.
  actualScore: number;
  // How much eval was lost by playing actualMove instead of bestMove (>= 0).
  scoreLoss: number;
  // Human-readable category derived from scoreLoss.
  quality: MoveQuality;
  // True if the actual move was exactly the engine's top choice.
  isBestMove: boolean;
}

// ─── Public API: gameplay ───────────────────────────────────────────────────

export function pickMove(
  board: Cell[][],
  aiColor: Player,
  difficulty: Difficulty,
): CompleteMove | null {
  const moves = getAllCompleteMoves(board, aiColor);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  switch (difficulty) {
    case "beginner":
      return moves[Math.floor(Math.random() * moves.length)];
    case "intermediate":
      return greedyMove(moves);
    case "advanced":
      return minimaxRoot(board, moves, aiColor, 2);
    case "expert":
      return minimaxRoot(board, moves, aiColor, 4);
    case "grandmaster":
      return minimaxRoot(board, moves, aiColor, 5);
  }
}

export function applyMove(board: Cell[][], move: CompleteMove): Cell[][] {
  const newBoard = cloneBoard(board);
  if (move.steps.length === 0) return newBoard;

  const firstStep = move.steps[0];
  let currentPiece = newBoard[firstStep.from.row][firstStep.from.col].piece;
  if (!currentPiece) {
    console.warn("applyMove: no piece at move source");
    return newBoard;
  }

  for (const step of move.steps) {
    newBoard[step.from.row][step.from.col].piece = null;
    if (step.capturedAt) {
      newBoard[step.capturedAt.row][step.capturedAt.col].piece = null;
    }

    const willBeKing =
      currentPiece.isKing ||
      shouldBecomeKing({ ...currentPiece, row: step.to.row });

    currentPiece = {
      ...currentPiece,
      row: step.to.row,
      col: step.to.col,
      isKing: willBeKing,
    };
    newBoard[step.to.row][step.to.col].piece = currentPiece;
  }

  return newBoard;
}

// ─── Public API: analysis ───────────────────────────────────────────────────

// Compare the actually-played move against the engine's top choice for the
// same position. Used by the post-game review screen. Runs at depth 4 by
// default — fast enough (~30-100ms per call) to feel snappy in lazy mode
// where one call is made per user navigation step.
export function analyzeMove(
  board: Cell[][],
  actualMove: CompleteMove,
  sideToMove: Player,
  depth: number = 4,
): AnalysisResult {
  const opponent: Player = sideToMove === "white" ? "black" : "white";
  const moves = getAllCompleteMoves(board, sideToMove);

  if (moves.length === 0) {
    // No legal moves — side has already lost; nothing to analyze.
    return {
      bestMove: null,
      bestScore: -10000,
      actualScore: -10000,
      scoreLoss: 0,
      quality: "good",
      isBestMove: true,
    };
  }

  // Search for the best move.
  let bestScore = -Infinity;
  let bestMove = moves[0];
  let alpha = -Infinity;

  for (const move of moves) {
    const newBoard = applyMove(board, move);
    // After our move it's opponent's turn; evaluate from our perspective.
    const score = minimax(
      newBoard,
      depth - 1,
      alpha,
      Infinity,
      opponent,
      sideToMove,
    );
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, bestScore);
  }

  // Score the actual move with a fresh full-window search so it's exact
  // (the bestMove loop uses growing alpha which may prune sibling scores).
  const actualResultBoard = applyMove(board, actualMove);
  const actualScore = minimax(
    actualResultBoard,
    depth - 1,
    -Infinity,
    Infinity,
    opponent,
    sideToMove,
  );

  const scoreLoss = Math.max(0, bestScore - actualScore);
  const quality = categorizeMove(scoreLoss);
  const isBestMove = movesEqual(actualMove, bestMove);

  return {
    bestMove,
    bestScore,
    actualScore,
    scoreLoss,
    quality,
    isBestMove,
  };
}

function categorizeMove(scoreLoss: number): MoveQuality {
  // Thresholds tuned for our eval where material = 3-5 per piece:
  //   < 0.3  ≈ "best move or tied"
  //   < 1.2  ≈ slight positional concession
  //   < 3.0  ≈ inaccuracy (suboptimal but not losing)
  //   < 6.0  ≈ mistake (lost ~1 piece worth of position)
  //   6+     ≈ blunder (lost ~2 pieces worth or game-deciding)
  if (scoreLoss < 0.3) return "best";
  if (scoreLoss < 1.2) return "good";
  if (scoreLoss < 3.0) return "inaccuracy";
  if (scoreLoss < 6.0) return "mistake";
  return "blunder";
}

function movesEqual(a: CompleteMove, b: CompleteMove): boolean {
  if (a.steps.length !== b.steps.length) return false;
  for (let i = 0; i < a.steps.length; i++) {
    const sa = a.steps[i];
    const sb = b.steps[i];
    if (sa.from.row !== sb.from.row || sa.from.col !== sb.from.col)
      return false;
    if (sa.to.row !== sb.to.row || sa.to.col !== sb.to.col) return false;
    const ac = sa.capturedAt;
    const bc = sb.capturedAt;
    if ((ac === null) !== (bc === null)) return false;
    if (ac && bc && (ac.row !== bc.row || ac.col !== bc.col)) return false;
  }
  return true;
}

// ─── Move generation ────────────────────────────────────────────────────────

export function getAllCompleteMoves(
  board: Cell[][],
  color: Player,
): CompleteMove[] {
  let captureExists = false;
  for (let r = 0; r < 8 && !captureExists; r++) {
    for (let c = 0; c < 8 && !captureExists; c++) {
      const piece = board[r][c].piece;
      if (piece?.color !== color) continue;
      if (getValidMoves(board, piece).some((m) => m.isCapture)) {
        captureExists = true;
      }
    }
  }

  const results: CompleteMove[] = [];

  if (captureExists) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c].piece;
        if (piece?.color !== color) continue;
        explodeCaptureChains(board, piece, [], results);
      }
    }
  } else {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c].piece;
        if (piece?.color !== color) continue;
        for (const m of getValidMoves(board, piece)) {
          if (!m.isCapture) {
            results.push({
              steps: [
                {
                  from: { row: piece.row, col: piece.col },
                  to: { row: m.row, col: m.col },
                  capturedAt: null,
                },
              ],
            });
          }
        }
      }
    }
  }

  return results;
}

function explodeCaptureChains(
  board: Cell[][],
  piece: Piece,
  pathSoFar: MoveStep[],
  results: CompleteMove[],
): void {
  const captures = getValidMoves(board, piece).filter((m) => m.isCapture);

  if (captures.length === 0) {
    if (pathSoFar.length > 0) {
      results.push({ steps: [...pathSoFar] });
    }
    return;
  }

  for (const cap of captures) {
    if (!cap.capturedPiece) continue;

    const nextBoard = cloneBoard(board);
    nextBoard[piece.row][piece.col].piece = null;
    nextBoard[cap.capturedPiece.row][cap.capturedPiece.col].piece = null;

    const willBeKing =
      piece.isKing || shouldBecomeKing({ ...piece, row: cap.row });
    const nextPiece: Piece = {
      ...piece,
      row: cap.row,
      col: cap.col,
      isKing: willBeKing,
    };
    nextBoard[cap.row][cap.col].piece = nextPiece;

    const newStep: MoveStep = {
      from: { row: piece.row, col: piece.col },
      to: { row: cap.row, col: cap.col },
      capturedAt: { row: cap.capturedPiece.row, col: cap.capturedPiece.col },
    };

    explodeCaptureChains(
      nextBoard,
      nextPiece,
      [...pathSoFar, newStep],
      results,
    );
  }
}

// ─── Strategy levels ────────────────────────────────────────────────────────

function greedyMove(moves: CompleteMove[]): CompleteMove {
  const captures = moves.filter((m) =>
    m.steps.some((s) => s.capturedAt !== null),
  );
  if (captures.length > 0) {
    captures.sort((a, b) => countCaptures(b) - countCaptures(a));
    const best = countCaptures(captures[0]);
    const tied = captures.filter((m) => countCaptures(m) === best);
    return tied[Math.floor(Math.random() * tied.length)];
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

function countCaptures(move: CompleteMove): number {
  return move.steps.reduce((n, s) => n + (s.capturedAt ? 1 : 0), 0);
}

function minimaxRoot(
  board: Cell[][],
  moves: CompleteMove[],
  aiColor: Player,
  depth: number,
): CompleteMove {
  const opponent: Player = aiColor === "white" ? "black" : "white";
  let bestScore = -Infinity;
  let bestMove = moves[0];
  let alpha = -Infinity;
  const beta = Infinity;

  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const move of shuffled) {
    const newBoard = applyMove(board, move);
    const score = minimax(newBoard, depth - 1, alpha, beta, opponent, aiColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, bestScore);
  }

  return bestMove;
}

function minimax(
  board: Cell[][],
  depth: number,
  alpha: number,
  beta: number,
  toMove: Player,
  aiColor: Player,
): number {
  if (depth === 0) {
    return evaluateBoard(board, aiColor);
  }

  const moves = getAllCompleteMoves(board, toMove);

  if (moves.length === 0) {
    return toMove === aiColor ? -10000 - depth : 10000 + depth;
  }

  const isMaximizing = toMove === aiColor;
  const opponent: Player = toMove === "white" ? "black" : "white";
  let best = isMaximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const newBoard = applyMove(board, move);
    const score = minimax(newBoard, depth - 1, alpha, beta, opponent, aiColor);

    if (isMaximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }

    if (beta <= alpha) break;
  }

  return best;
}

function evaluateBoard(board: Cell[][], forColor: Player): number {
  let myScore = 0;
  let oppScore = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c].piece;
      if (!piece) continue;

      let value = piece.isKing ? 5 : 3;

      if (!piece.isKing) {
        const advance = piece.color === "white" ? 7 - piece.row : piece.row;
        value += advance * 0.2;
      } else {
        const centerDistance =
          Math.abs(3.5 - piece.row) + Math.abs(3.5 - piece.col);
        value += (7 - centerDistance) * 0.05;
      }

      if (piece.color === "white" && piece.row === 7) value += 0.3;
      if (piece.color === "black" && piece.row === 0) value += 0.3;

      if (piece.color === forColor) myScore += value;
      else oppScore += value;
    }
  }

  return myScore - oppScore;
}

export function parseDifficulty(input: string | undefined): Difficulty {
  const valid: Difficulty[] = [
    "beginner",
    "intermediate",
    "advanced",
    "expert",
    "grandmaster",
  ];
  const normalized = (input ?? "").toLowerCase();
  return (valid as string[]).includes(normalized)
    ? (normalized as Difficulty)
    : "expert";
}
