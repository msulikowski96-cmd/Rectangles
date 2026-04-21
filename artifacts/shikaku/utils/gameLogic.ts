import { Cell, Hint, Rectangle, Puzzle } from '../types/game';

export function getRectangleBounds(startRow: number, startCol: number, endRow: number, endCol: number) {
  return {
    minRow: Math.min(startRow, endRow),
    maxRow: Math.max(startRow, endRow),
    minCol: Math.min(startCol, endCol),
    maxCol: Math.max(startCol, endCol),
  };
}

export function getRectangleArea(startRow: number, startCol: number, endRow: number, endCol: number): number {
  const { minRow, maxRow, minCol, maxCol } = getRectangleBounds(startRow, startCol, endRow, endCol);
  return (maxRow - minRow + 1) * (maxCol - minCol + 1);
}

export function cellsInRectangle(startRow: number, startCol: number, endRow: number, endCol: number): Cell[] {
  const { minRow, maxRow, minCol, maxCol } = getRectangleBounds(startRow, startCol, endRow, endCol);
  const cells: Cell[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

export function isCellInRectangle(cell: Cell, rect: Rectangle): boolean {
  const { minRow, maxRow, minCol, maxCol } = getRectangleBounds(rect.startRow, rect.startCol, rect.endRow, rect.endCol);
  return cell.row >= minRow && cell.row <= maxRow && cell.col >= minCol && cell.col <= maxCol;
}

export function hintsInRectangle(startRow: number, startCol: number, endRow: number, endCol: number, hints: Hint[]): Hint[] {
  const { minRow, maxRow, minCol, maxCol } = getRectangleBounds(startRow, startCol, endRow, endCol);
  return hints.filter(h => h.row >= minRow && h.row <= maxRow && h.col >= minCol && h.col <= maxCol);
}

export function validateRectangle(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  hints: Hint[],
  existingRects: Rectangle[],
  currentRectId?: string,
): { valid: boolean; reason?: string; containedHint?: Hint } {
  const area = getRectangleArea(startRow, startCol, endRow, endCol);
  const { minRow, maxRow, minCol, maxCol } = getRectangleBounds(startRow, startCol, endRow, endCol);

  // Must contain exactly one hint
  const containedHints = hintsInRectangle(startRow, startCol, endRow, endCol, hints);
  if (containedHints.length === 0) {
    return { valid: false, reason: 'no_hint' };
  }
  if (containedHints.length > 1) {
    return { valid: false, reason: 'multiple_hints' };
  }

  const hint = containedHints[0];

  // Area must match the hint
  if (area !== hint.value) {
    return { valid: false, reason: 'wrong_area', containedHint: hint };
  }

  // Must not overlap with existing rectangles (except itself)
  for (const rect of existingRects) {
    if (rect.id === currentRectId) continue;
    const { minRow: rMinRow, maxRow: rMaxRow, minCol: rMinCol, maxCol: rMaxCol } = getRectangleBounds(
      rect.startRow, rect.startCol, rect.endRow, rect.endCol
    );
    // Check overlap
    const overlaps = !(maxRow < rMinRow || minRow > rMaxRow || maxCol < rMinCol || minCol > rMaxCol);
    if (overlaps) {
      return { valid: false, reason: 'overlap' };
    }
  }

  return { valid: true, containedHint: hint };
}

export function checkPuzzleComplete(puzzle: Puzzle, rectangles: Rectangle[]): boolean {
  // All hints must be covered by exactly one correct rectangle
  const totalCells = puzzle.rows * puzzle.cols;
  let coveredCells = 0;
  let allCorrect = true;

  for (const rect of rectangles) {
    if (!rect.isCorrect) {
      allCorrect = false;
    } else {
      const area = getRectangleArea(rect.startRow, rect.startCol, rect.endRow, rect.endCol);
      coveredCells += area;
    }
  }

  return allCorrect && coveredCells === totalCells;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function generateRectId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
