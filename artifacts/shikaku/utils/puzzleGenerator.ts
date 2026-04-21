import { Puzzle, Hint, Difficulty } from '../types/game';

// Mulberry32 - small seeded PRNG, deterministic for the same seed
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RectSpec {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

function difficultyConfig(difficulty: Difficulty): { rows: number; cols: number; minArea: number; maxArea: number } {
  if (difficulty === 'easy') return { rows: 5, cols: 5, minArea: 2, maxArea: 6 };
  if (difficulty === 'medium') return { rows: 7, cols: 7, minArea: 2, maxArea: 8 };
  return { rows: 9, cols: 9, minArea: 2, maxArea: 9 };
}

function tryGenerateLayout(rows: number, cols: number, minArea: number, maxArea: number, rng: () => number): RectSpec[] | null {
  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const rects: RectSpec[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) continue;

      // Find max width to the right (consecutive empty cells in row r starting at c)
      let maxW = 0;
      while (c + maxW < cols && !grid[r][c + maxW]) maxW++;

      // Enumerate candidate (w, h) with rect anchored at (r, c) as top-left,
      // staying within grid and not overlapping occupied cells.
      const candidates: { w: number; h: number; area: number }[] = [];
      for (let w = 1; w <= maxW; w++) {
        // For each width, compute max height such that all cells in [r..r+h-1] x [c..c+w-1] are empty
        let maxH = 0;
        outer: for (let h = 1; r + h - 1 < rows; h++) {
          for (let cc = c; cc < c + w; cc++) {
            if (grid[r + h - 1][cc]) break outer;
          }
          maxH = h;
        }
        for (let h = 1; h <= maxH; h++) {
          const area = w * h;
          if (area >= minArea && area <= maxArea) candidates.push({ w, h, area });
        }
      }

      let pick: { w: number; h: number };
      if (candidates.length === 0) {
        // Cannot place a rectangle of valid area starting here -> abort, retry with new seed
        return null;
      } else {
        // Bias toward larger areas but keep variety: weight = area
        const weights = candidates.map(c => c.area);
        const total = weights.reduce((a, b) => a + b, 0);
        let pickIdx = 0;
        let r2 = rng() * total;
        for (let i = 0; i < weights.length; i++) {
          r2 -= weights[i];
          if (r2 <= 0) {
            pickIdx = i;
            break;
          }
        }
        pick = candidates[pickIdx];
      }

      // Place the rectangle
      for (let dr = 0; dr < pick.h; dr++) {
        for (let dc = 0; dc < pick.w; dc++) {
          grid[r + dr][c + dc] = true;
        }
      }
      rects.push({ r0: r, c0: c, r1: r + pick.h - 1, c1: c + pick.w - 1 });
    }
  }
  return rects;
}

export function generatePuzzle(difficulty: Difficulty, seed: number, name: string, id: string): Puzzle {
  const { rows, cols, minArea, maxArea } = difficultyConfig(difficulty);

  // Try multiple seed offsets in case some fail to fully tile
  let layout: RectSpec[] | null = null;
  let attemptSeed = seed;
  for (let attempt = 0; attempt < 100; attempt++) {
    const rng = mulberry32(attemptSeed);
    layout = tryGenerateLayout(rows, cols, minArea, maxArea, rng);
    if (layout) break;
    attemptSeed = (attemptSeed * 16807 + 1) >>> 0;
  }

  // Final fallback: allow 1x1 rectangles too (always succeeds)
  if (!layout) {
    const rng = mulberry32(seed);
    layout = tryGenerateLayout(rows, cols, 1, maxArea, rng) || [];
  }

  const finalRng = mulberry32(attemptSeed ^ 0xABCDEF);
  const hints: Hint[] = layout.map(rect => {
    const w = rect.c1 - rect.c0 + 1;
    const h = rect.r1 - rect.r0 + 1;
    const hr = rect.r0 + Math.floor(finalRng() * h);
    const hc = rect.c0 + Math.floor(finalRng() * w);
    return { row: hr, col: hc, value: w * h };
  });

  return {
    id,
    name,
    rows,
    cols,
    hints,
    solution: layout.map(rect => ({
      row: rect.r0,
      col: rect.c0,
      width: rect.c1 - rect.c0 + 1,
      height: rect.r1 - rect.r0 + 1,
      hintRow: 0,
      hintCol: 0,
    })),
  };
}

const PUZZLE_NAMES: Record<Difficulty, string[]> = {
  easy: ['Spacer', 'Rozgrzewka', 'Pierwszy krok', 'Lekka bryza', 'Świtanie', 'Promyk', 'Mała chmura', 'Iskra'],
  medium: ['Wyzwanie', 'Burza myśli', 'Labirynt', 'Mozaika', 'Skupienie', 'Strategia', 'Próba', 'Splot'],
  hard: ['Mistrz', 'Zagadka', 'Łamigłówka', 'Twierdza', 'Ekspert', 'Próba sił', 'Cierpliwość', 'Geniusz'],
};

export function generatePuzzleSet(difficulty: Difficulty, count = 8): Puzzle[] {
  const names = PUZZLE_NAMES[difficulty];
  // Deterministic seeds per (difficulty, index) so puzzle IDs remain stable for completion tracking
  const baseSeed = difficulty === 'easy' ? 1000 : difficulty === 'medium' ? 5000 : 9000;
  return Array.from({ length: count }).map((_, i) =>
    generatePuzzle(
      difficulty,
      baseSeed + i * 137,
      names[i % names.length] + ' ' + (i + 1),
      `${difficulty}-gen-${i + 1}`,
    ),
  );
}

// Random "infinite" puzzle generation (used for the "next puzzle" flow)
export function generateRandomPuzzle(difficulty: Difficulty): Puzzle {
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;
  return generatePuzzle(difficulty, seed, 'Losowa', `${difficulty}-rand-${seed}`);
}
