// ────────────────────────────────────────────────────────────────────────────
// gameLogic.ts
// Pure checkers logic — no React, no Supabase, no side effects.
// ────────────────────────────────────────────────────────────────────────────

export interface Piece {
  id: string;
  row: number;
  col: number;
  color: "black" | "white";
  isKing: boolean;
}

export interface Cell {
  row: number;
  col: number;
  isDark: boolean;
  piece: Piece | null;
  isHighlighted: boolean;
  isValidMove: boolean;
  isCapture: boolean;
}

export type Player = "white" | "black";

export interface BasicMove {
  row: number;
  col: number;
  isCapture: boolean;
  capturedPiece?: { row: number; col: number };
}

// ─── Coordinate helpers ──────────────────────────────────────────────────────
export function rcToPos(row: number, col: number): number {
  return row * 8 + col;
}

export function posToRc(pos: number): { row: number; col: number } {
  return { row: Math.floor(pos / 8), col: pos % 8 };
}

// ─── Initial board ──────────────────────────────────────────────────────────

export function createInitialBoard(): Cell[][] {
  const board: Cell[][] = [];

  for (let row = 0; row < 8; row++) {
    const boardRow: Cell[] = [];
    for (let col = 0; col < 8; col++) {
      const isDark = (row + col) % 2 === 1;
      let piece: Piece | null = null;

      if (isDark && row < 3) {
        piece = {
          id: `b-${row}-${col}`,
          row,
          col,
          color: "black",
          isKing: false,
        };
      } else if (isDark && row > 4) {
        piece = {
          id: `w-${row}-${col}`,
          row,
          col,
          color: "white",
          isKing: false,
        };
      }

      boardRow.push({
        row,
        col,
        isDark,
        piece,
        isHighlighted: false,
        isValidMove: false,
        isCapture: false,
      });
    }
    board.push(boardRow);
  }

  return board;
}

// ─── Move generation ────────────────────────────────────────────────────────

export function getValidMoves(board: Cell[][], piece: Piece): BasicMove[] {
  const moves: BasicMove[] = [];

  const directions = piece.isKing
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : piece.color === "white"
      ? [
          [-1, -1],
          [-1, 1],
        ]
      : [
          [1, -1],
          [1, 1],
        ];

  for (const [dr, dc] of directions) {
    const newRow = piece.row + dr;
    const newCol = piece.col + dc;
    if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) continue;

    const target = board[newRow][newCol];
    if (!target.piece) {
      moves.push({ row: newRow, col: newCol, isCapture: false });
    } else if (target.piece.color !== piece.color) {
      const jumpRow = piece.row + dr * 2;
      const jumpCol = piece.col + dc * 2;
      if (jumpRow >= 0 && jumpRow <= 7 && jumpCol >= 0 && jumpCol <= 7) {
        if (!board[jumpRow][jumpCol].piece) {
          moves.push({
            row: jumpRow,
            col: jumpCol,
            isCapture: true,
            capturedPiece: { row: newRow, col: newCol },
          });
        }
      }
    }
  }

  return moves;
}

export function getMandatoryCaptures(
  board: Cell[][],
  player: Player,
): { piece: Piece; move: BasicMove }[] {
  const captures: { piece: Piece; move: BasicMove }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c].piece;
      if (piece?.color !== player) continue;
      for (const move of getValidMoves(board, piece)) {
        if (move.isCapture) captures.push({ piece, move });
      }
    }
  }
  return captures;
}

export function shouldBecomeKing(piece: Piece): boolean {
  return (
    (piece.color === "white" && piece.row === 0) ||
    (piece.color === "black" && piece.row === 7)
  );
}

export function getHintMove(
  board: Cell[][],
  currentPlayer: Player,
): { from: { row: number; col: number }; to: BasicMove } | null {
  const pieces: Piece[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c].piece?.color === currentPlayer) {
        pieces.push(board[r][c].piece!);
      }
    }
  }

  for (const p of pieces) {
    const captures = getValidMoves(board, p).filter((m) => m.isCapture);
    if (captures.length) {
      return { from: { row: p.row, col: p.col }, to: captures[0] };
    }
  }
  for (const p of pieces) {
    const moves = getValidMoves(board, p);
    if (moves.length) {
      return { from: { row: p.row, col: p.col }, to: moves[0] };
    }
  }
  return null;
}

export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      piece: cell.piece ? { ...cell.piece } : null,
    })),
  );
}

export function detectPieceWinner(board: Cell[][]): Player | null {
  let whiteCount = 0;
  let blackCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c].piece;
      if (p?.color === "white") whiteCount++;
      if (p?.color === "black") blackCount++;
    }
  }
  if (blackCount === 0 && whiteCount > 0) return "white";
  if (whiteCount === 0 && blackCount > 0) return "black";
  return null;
}
