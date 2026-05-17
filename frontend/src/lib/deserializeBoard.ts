export function deserializeBoard(board: any) {
  return board.map((row: any[]) =>
    row.map((cell: any) => ({
      row: cell.row,

      col: cell.col,

      isDark: (cell.row + cell.col) % 2 === 1,

      piece: cell.piece,

      isHighlighted: false,

      isValidMove: false,

      isCapture: false,
    })),
  );
}
