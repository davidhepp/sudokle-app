/**
 * Difficulty policies and structural constraints for puzzle generation
 */

import { Difficulty } from "./types";
import type { Technique } from "./human-solver";

export interface DifficultyPolicy {
  maxTechnique: Technique;
  minInitialSingles: number;
  minBoxGivens: number;
  minLineGivens: number;
}

/**
 * Policy definitions for each difficulty level
 * These constraints ensure puzzles are well-formed and appropriately challenging
 */
export const DIFFICULTY_POLICY: Record<Difficulty, DifficultyPolicy> = {
  [Difficulty.Easy]: {
    maxTechnique: "HiddenSingle",
    minInitialSingles: 8,
    minBoxGivens: 1,
    minLineGivens: 1,
  },
  [Difficulty.Medium]: {
    maxTechnique: "NakedPair",
    minInitialSingles: 4,
    minBoxGivens: 1,
    minLineGivens: 1,
  },
  [Difficulty.Hard]: {
    maxTechnique: "HiddenTriple",
    minInitialSingles: 2,
    minBoxGivens: 1,
    minLineGivens: 0,
  },
  [Difficulty.Expert]: {
    maxTechnique: "XYWing",
    minInitialSingles: 0,
    minBoxGivens: 0,
    minLineGivens: 0,
  },
};

/**
 * Check if a puzzle meets the distribution guards for a given policy
 * Ensures the puzzle has a reasonable structure (not too sparse)
 */
export function meetsDistributionGuards(
  grid: number[][],
  policy: DifficultyPolicy
): boolean {
  // Check minimum givens per 3x3 box
  for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
    const startRow = Math.floor(boxIdx / 3) * 3;
    const startCol = (boxIdx % 3) * 3;
    let givens = 0;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[startRow + r][startCol + c] !== 0) {
          givens++;
        }
      }
    }

    if (givens < policy.minBoxGivens) {
      return false;
    }
  }

  // Check minimum givens per row
  for (let row = 0; row < 9; row++) {
    let givens = 0;
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] !== 0) {
        givens++;
      }
    }
    if (givens < policy.minLineGivens) {
      return false;
    }
  }

  // Check minimum givens per column
  for (let col = 0; col < 9; col++) {
    let givens = 0;
    for (let row = 0; row < 9; row++) {
      if (grid[row][col] !== 0) {
        givens++;
      }
    }
    if (givens < policy.minLineGivens) {
      return false;
    }
  }

  return true;
}

/**
 * Get the policy for a specific difficulty level
 */
export function getPolicyFor(difficulty: Difficulty): DifficultyPolicy {
  return DIFFICULTY_POLICY[difficulty];
}

/**
 * Count the number of givens (filled cells) in a grid
 */
export function countGivens(grid: number[][]): number {
  let count = 0;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] !== 0) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Get statistics about a puzzle's structure
 */
export interface PuzzleStats {
  givens: number;
  emptyCells: number;
  minBoxGivens: number;
  maxBoxGivens: number;
  minRowGivens: number;
  maxRowGivens: number;
  minColGivens: number;
  maxColGivens: number;
}

export function getPuzzleStats(grid: number[][]): PuzzleStats {
  const givens = countGivens(grid);
  const emptyCells = 81 - givens;

  let minBoxGivens = 9;
  let maxBoxGivens = 0;

  for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
    const startRow = Math.floor(boxIdx / 3) * 3;
    const startCol = (boxIdx % 3) * 3;
    let boxGivens = 0;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[startRow + r][startCol + c] !== 0) {
          boxGivens++;
        }
      }
    }

    minBoxGivens = Math.min(minBoxGivens, boxGivens);
    maxBoxGivens = Math.max(maxBoxGivens, boxGivens);
  }

  let minRowGivens = 9;
  let maxRowGivens = 0;

  for (let row = 0; row < 9; row++) {
    let rowGivens = 0;
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] !== 0) {
        rowGivens++;
      }
    }
    minRowGivens = Math.min(minRowGivens, rowGivens);
    maxRowGivens = Math.max(maxRowGivens, rowGivens);
  }

  let minColGivens = 9;
  let maxColGivens = 0;

  for (let col = 0; col < 9; col++) {
    let colGivens = 0;
    for (let row = 0; row < 9; row++) {
      if (grid[row][col] !== 0) {
        colGivens++;
      }
    }
    minColGivens = Math.min(minColGivens, colGivens);
    maxColGivens = Math.max(maxColGivens, colGivens);
  }

  return {
    givens,
    emptyCells,
    minBoxGivens,
    maxBoxGivens,
    minRowGivens,
    maxRowGivens,
    minColGivens,
    maxColGivens,
  };
}
