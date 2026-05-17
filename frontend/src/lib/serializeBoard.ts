import { Cell } from "@/components/game/CheckersBoard";

export function serializeBoard(board: Cell[][]) {
  return board.map((row) =>
    row.map((cell) => ({
      row: cell.row,
      col: cell.col,

      piece: cell.piece
        ? {
            id: cell.piece.id,

            row: cell.piece.row,
            col: cell.piece.col,

            color: cell.piece.color,

            isKing: cell.piece.isKing,
          }
        : null,
    })),
  );
}
