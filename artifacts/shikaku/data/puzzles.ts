import { Puzzle } from '../types/game';
import { generatePuzzleSet } from '../utils/puzzleGenerator';

export const EASY_PUZZLES: Puzzle[] = generatePuzzleSet('easy', 8);
export const MEDIUM_PUZZLES: Puzzle[] = generatePuzzleSet('medium', 8);
export const HARD_PUZZLES: Puzzle[] = generatePuzzleSet('hard', 8);

export const ALL_PUZZLES = {
  easy: EASY_PUZZLES,
  medium: MEDIUM_PUZZLES,
  hard: HARD_PUZZLES,
};
