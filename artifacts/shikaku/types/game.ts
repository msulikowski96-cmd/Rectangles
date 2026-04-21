export interface Cell {
  row: number;
  col: number;
}

export interface Hint {
  row: number;
  col: number;
  value: number;
}

export interface Rectangle {
  id: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  hintRow: number;
  hintCol: number;
  colorIndex: number;
  isCorrect: boolean;
}

export interface Puzzle {
  id: string;
  name: string;
  rows: number;
  cols: number;
  hints: Hint[];
  solution: { row: number; col: number; width: number; height: number; hintRow: number; hintCol: number }[];
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameState {
  puzzle: Puzzle;
  rectangles: Rectangle[];
  selectedCell: Cell | null;
  drawingStart: Cell | null;
  drawingEnd: Cell | null;
  isComplete: boolean;
  moves: number;
  startTime: number;
  elapsedTime: number;
}
