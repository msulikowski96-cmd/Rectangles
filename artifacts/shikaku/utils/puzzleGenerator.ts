import { Puzzle, Hint } from '../types/game';

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

export interface LevelConfig {
  rows: number;
  cols: number;
  minArea: number;
  maxArea: number;
}

// Continuous progression — each level is harder than the previous.
// Difficulty increases via grid size and max rectangle area.
export function levelConfig(level: number): LevelConfig {
  const lvl = Math.max(1, level);
  // Grid grows from 5 → 9 over the first ~20 levels, then stays at 9.
  const grid = Math.min(5 + Math.floor((lvl - 1) / 5), 9);
  // Max rectangle area grows steadily, capped by grid for sanity.
  const maxArea = Math.min(4 + Math.floor((lvl - 1) / 2), Math.max(grid, 12));
  return { rows: grid, cols: grid, minArea: 2, maxArea };
}

function tryGenerateLayout(rows: number, cols: number, minArea: number, maxArea: number, rng: () => number): RectSpec[] | null {
  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const rects: RectSpec[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) continue;

      let maxW = 0;
      while (c + maxW < cols && !grid[r][c + maxW]) maxW++;

      const candidates: { w: number; h: number; area: number }[] = [];
      for (let w = 1; w <= maxW; w++) {
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

      if (candidates.length === 0) return null;

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
      const pick = candidates[pickIdx];

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

function countSolutions(rows: number, cols: number, hints: Hint[], limit: number): number {
  const candsForHint: RectSpec[][] = hints.map(hint => {
    const out: RectSpec[] = [];
    const v = hint.value;
    for (let r0 = Math.max(0, hint.row - v + 1); r0 <= hint.row; r0++) {
      for (let r1 = hint.row; r1 < Math.min(rows, r0 + v); r1++) {
        const h = r1 - r0 + 1;
        if (v % h !== 0) continue;
        const w = v / h;
        for (let c0 = Math.max(0, hint.col - w + 1); c0 <= hint.col; c0++) {
          const c1 = c0 + w - 1;
          if (c1 < hint.col || c1 >= cols) continue;
          let containsCount = 0;
          for (const h2 of hints) {
            if (h2.row >= r0 && h2.row <= r1 && h2.col >= c0 && h2.col <= c1) {
              containsCount++;
              if (containsCount > 1) break;
            }
          }
          if (containsCount !== 1) continue;
          out.push({ r0, r1, c0, c1 });
        }
      }
    }
    return out;
  });

  for (const cands of candsForHint) if (cands.length === 0) return 0;

  const order = hints.map((_, i) => i).sort((a, b) => candsForHint[a].length - candsForHint[b].length);

  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  let count = 0;

  function place(rect: RectSpec, val: number) {
    for (let r = rect.r0; r <= rect.r1; r++)
      for (let c = rect.c0; c <= rect.c1; c++)
        grid[r][c] = val;
  }
  function fits(rect: RectSpec): boolean {
    for (let r = rect.r0; r <= rect.r1; r++)
      for (let c = rect.c0; c <= rect.c1; c++)
        if (grid[r][c] !== 0) return false;
    return true;
  }
  function solve(idx: number) {
    if (count >= limit) return;
    if (idx === order.length) {
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if (grid[r][c] === 0) return;
      count++;
      return;
    }
    const hi = order[idx];
    const cands = candsForHint[hi];
    for (const rect of cands) {
      if (!fits(rect)) continue;
      place(rect, hi + 1);
      solve(idx + 1);
      place(rect, 0);
      if (count >= limit) return;
    }
  }
  solve(0);
  return count;
}

interface BuiltPuzzle {
  rows: number;
  cols: number;
  hints: Hint[];
  layout: RectSpec[];
}

function buildOnce(cfg: LevelConfig, layoutSeed: number, hintRng: () => number): BuiltPuzzle | null {
  const layout = tryGenerateLayout(cfg.rows, cfg.cols, cfg.minArea, cfg.maxArea, mulberry32(layoutSeed));
  if (!layout) return null;
  const hints: Hint[] = layout.map(rect => {
    const w = rect.c1 - rect.c0 + 1;
    const h = rect.r1 - rect.r0 + 1;
    const hr = rect.r0 + Math.floor(hintRng() * h);
    const hc = rect.c0 + Math.floor(hintRng() * w);
    return { row: hr, col: hc, value: w * h };
  });
  return { rows: cfg.rows, cols: cfg.cols, hints, layout };
}

function buildUnique(cfg: LevelConfig, baseSeed: number, maxAttempts = 60): BuiltPuzzle {
  let bestNonUnique: { built: BuiltPuzzle; count: number } | null = null;
  let seed = baseSeed >>> 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (let hintTry = 0; hintTry < 6; hintTry++) {
      const hintRng = mulberry32((seed ^ 0x9E3779B9 ^ (hintTry * 2654435761)) >>> 0);
      const built = buildOnce(cfg, seed, hintRng);
      if (!built) break;
      const count = countSolutions(built.rows, built.cols, built.hints, 2);
      if (count === 1) return built;
      if (count >= 1 && (!bestNonUnique || count < bestNonUnique.count)) {
        bestNonUnique = { built, count };
      }
    }
    seed = (Math.imul(seed, 16807) + 1) >>> 0;
  }
  if (bestNonUnique) return bestNonUnique.built;

  const layout = tryGenerateLayout(cfg.rows, cfg.cols, 1, cfg.maxArea, mulberry32(baseSeed)) || [];
  const hintRng = mulberry32(baseSeed ^ 0xABCDEF);
  const hints: Hint[] = layout.map(rect => {
    const w = rect.c1 - rect.c0 + 1;
    const h = rect.r1 - rect.r0 + 1;
    return {
      row: rect.r0 + Math.floor(hintRng() * h),
      col: rect.c0 + Math.floor(hintRng() * w),
      value: w * h,
    };
  });
  return { rows: cfg.rows, cols: cfg.cols, hints, layout };
}

// Deterministic per-level seed — same level always produces same puzzle,
// but each level number gets a totally different one.
function levelSeed(level: number): number {
  // Mix the level number with a large prime for good seed distribution
  return ((level * 2654435761) ^ 0xDEADBEEF) >>> 0;
}

export function generateLevelPuzzle(level: number): Puzzle {
  const cfg = levelConfig(level);
  const built = buildUnique(cfg, levelSeed(level));
  return {
    id: `level-${level}`,
    name: `Poziom ${level}`,
    rows: built.rows,
    cols: built.cols,
    hints: built.hints,
    solution: built.layout.map(rect => ({
      row: rect.r0,
      col: rect.c0,
      width: rect.c1 - rect.c0 + 1,
      height: rect.r1 - rect.r0 + 1,
      hintRow: 0,
      hintCol: 0,
    })),
  };
}
