/**
 * Rating system for Sudoku puzzles based on human-solving techniques
 */

import { Difficulty } from "./types";
import { type Technique, type SolveReport, solveHuman } from "./human-solver";

export interface Rating {
  band: Difficulty;
  score: number;
  hardest: Technique | null;
}

/**
 * Weighted scores for each technique
 * Higher weight = harder technique
 */
const TECHNIQUE_WEIGHTS: Record<Technique, number> = {
  NakedSingle: 1,
  HiddenSingle: 1,
  LockedCandidate: 2,
  NakedPair: 3,
  HiddenPair: 3,
  NakedTriple: 4,
  HiddenTriple: 4,
  XWing: 5,
  XYWing: 6,
};

/**
 * Map technique to difficulty band
 * This determines the maximum technique allowed for each difficulty
 */
const TECHNIQUE_TO_BAND: Record<Technique, Difficulty> = {
  NakedSingle: Difficulty.Easy,
  HiddenSingle: Difficulty.Easy,
  LockedCandidate: Difficulty.Medium,
  NakedPair: Difficulty.Medium,
  HiddenPair: Difficulty.Hard,
  NakedTriple: Difficulty.Hard,
  HiddenTriple: Difficulty.Hard,
  XWing: Difficulty.Expert,
  XYWing: Difficulty.Expert,
};

/**
 * Get the maximum technique allowed for a difficulty level
 *
 * This determines which solving techniques are permitted when solving
 * a puzzle of the given difficulty. Puzzles should be solvable using
 * only techniques up to and including this cap.
 *
 * @param difficulty - The target difficulty level
 * @returns The maximum technique that should be required for this difficulty
 *
 * @example
 * ```ts
 * const cap = techniqueCapFor(Difficulty.Medium);
 * // Returns "NakedPair" - Medium puzzles should not require harder techniques
 * ```
 */
export function techniqueCapFor(difficulty: Difficulty): Technique {
  switch (difficulty) {
    case Difficulty.Easy:
      return "HiddenSingle";
    case Difficulty.Medium:
      return "NakedPair";
    case Difficulty.Hard:
      return "HiddenTriple";
    case Difficulty.Expert:
      return "XYWing";
  }
}

/**
 * Convert a solve report to a difficulty rating
 *
 * Analyzes the techniques used to solve a puzzle and assigns a difficulty
 * rating based on the hardest technique required and a weighted score.
 *
 * @param report - The solve report from the human solver
 * @returns A rating with difficulty band, score, and hardest technique
 *
 * @example
 * ```ts
 * const report = solveHuman(grid);
 * const rating = toRating(report);
 * console.log(rating.band); // "Medium"
 * console.log(rating.hardest); // "LockedCandidate"
 * ```
 */
export function toRating(report: SolveReport): Rating {
  // Calculate weighted score
  let score = 0;
  for (const [technique, count] of Object.entries(report.counts)) {
    const weight = TECHNIQUE_WEIGHTS[technique as Technique];
    score += weight * count;
  }

  // Determine difficulty band based on hardest technique
  let band = Difficulty.Easy;
  if (report.hardest) {
    band = TECHNIQUE_TO_BAND[report.hardest];
  }

  return {
    band,
    score,
    hardest: report.hardest,
  };
}

/**
 * Rate a puzzle by solving it with human techniques
 *
 * This is a convenience function that solves the puzzle using human-style
 * techniques and returns a difficulty rating. It's the main entry point
 * for rating existing puzzles.
 *
 * @param grid - A 9x9 grid with numbers 1-9 (0 for empty cells)
 * @returns A rating indicating the puzzle's difficulty band and techniques required
 *
 * @example
 * ```ts
 * const grid = stringToGrid("003020600900305001001806400...");
 * const rating = ratePuzzle(grid);
 * console.log(`This puzzle is ${rating.band} difficulty`);
 * ```
 */
export function ratePuzzle(grid: number[][]): Rating {
  const report = solveHuman(grid);
  return toRating(report);
}

/**
 * Convert an 81-character string to a 9x9 grid
 */
export function stringToGrid(boardString: string): number[][] {
  const grid: number[][] = Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));

  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    grid[row][col] = parseInt(boardString[i]) || 0;
  }

  return grid;
}

/**
 * Check if a rating is within the target difficulty band
 * Allows Easy puzzles to be rated as Easy
 * Allows Medium puzzles to be rated as Easy or Medium
 * etc.
 */
export function isWithinBand(
  rating: Rating,
  targetDifficulty: Difficulty
): boolean {
  const bandOrder = [
    Difficulty.Easy,
    Difficulty.Medium,
    Difficulty.Hard,
    Difficulty.Expert,
  ];
  const targetIndex = bandOrder.indexOf(targetDifficulty);
  const ratingIndex = bandOrder.indexOf(rating.band);

  // Rating should not exceed target difficulty
  return ratingIndex <= targetIndex;
}

/**
 * Check if a rating exactly matches the target difficulty
 */
export function isExactBand(
  rating: Rating,
  targetDifficulty: Difficulty
): boolean {
  return rating.band === targetDifficulty;
}
