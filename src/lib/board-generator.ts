import { solveHuman } from "./human-solver";
import {
  techniqueCapFor,
  toRating,
  isWithinBand,
  ratePuzzle,
  stringToGrid,
} from "./rating";
import { getPolicyFor, meetsDistributionGuards } from "./policy";
import { Difficulty, type SudokuPuzzle } from "./types";

// Re-export types and utility functions
export { Difficulty, type SudokuPuzzle };
export { ratePuzzle, stringToGrid, solveHuman, techniqueCapFor };

class SudokuGenerator {
  private grid: number[][];

  constructor() {
    this.grid = Array(9)
      .fill(null)
      .map(() => Array(9).fill(0));
  }

  // Check if a number is valid at a given position
  private isValid(row: number, col: number, num: number): boolean {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (this.grid[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (this.grid[x][col] === num) return false;
    }

    // Check 3x3 box
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.grid[i + startRow][j + startCol] === num) return false;
      }
    }

    return true;
  }

  // Fill the grid with a valid complete Sudoku solution
  private fillGrid(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.grid[row][col] === 0) {
          // Try numbers 1-9 in random order
          const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

          for (const num of numbers) {
            if (this.isValid(row, col, num)) {
              this.grid[row][col] = num;

              if (this.fillGrid()) {
                return true;
              }

              this.grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  // Shuffle array using Fisher-Yates algorithm
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Convert 2D grid to 81-character string
  private gridToString(grid: number[][]): string {
    return grid
      .flat()
      .map((cell) => cell.toString())
      .join("");
  }

  // Create a copy of the grid
  private copyGrid(): number[][] {
    return this.grid.map((row) => [...row]);
  }

  // Create a copy of any grid
  private copyAnyGrid(grid: number[][]): number[][] {
    return grid.map((row) => [...row]);
  }

  // Check if a number is valid at a given position for any grid
  private isValidForGrid(
    grid: number[][],
    row: number,
    col: number,
    num: number
  ): boolean {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (grid[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (grid[x][col] === num) return false;
    }

    // Check 3x3 box
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[i + startRow][j + startCol] === num) return false;
      }
    }

    return true;
  }

  // Solve a Sudoku puzzle and count the number of solutions
  public countSolutions(grid: number[][], maxSolutions: number = 2): number {
    const workingGrid = this.copyAnyGrid(grid);
    return this.countSolutionsRecursive(workingGrid, 0, 0, maxSolutions);
  }

  private countSolutionsRecursive(
    grid: number[][],
    row: number,
    col: number,
    maxSolutions: number
  ): number {
    // Move to next row if we've reached the end of current row
    if (col === 9) {
      return this.countSolutionsRecursive(grid, row + 1, 0, maxSolutions);
    }

    // If we've filled all rows, we found a solution
    if (row === 9) {
      return 1;
    }

    // If cell is already filled, move to next cell
    if (grid[row][col] !== 0) {
      return this.countSolutionsRecursive(grid, row, col + 1, maxSolutions);
    }

    let solutionCount = 0;

    // Try numbers 1-9
    for (let num = 1; num <= 9; num++) {
      if (this.isValidForGrid(grid, row, col, num)) {
        grid[row][col] = num;

        solutionCount += this.countSolutionsRecursive(
          grid,
          row,
          col + 1,
          maxSolutions
        );

        // Early exit if we've found more than maxSolutions
        if (solutionCount >= maxSolutions) {
          grid[row][col] = 0;
          return solutionCount;
        }

        grid[row][col] = 0;
      }
    }

    return solutionCount;
  }

  // Check if a puzzle has a unique solution
  private hasUniqueSolution(grid: number[][]): boolean {
    return this.countSolutions(grid, 2) === 1;
  }

  // Remove cells based on difficulty level with uniqueness and human-solvability checks
  private removeCells(difficulty: Difficulty): number[][] {
    const puzzleGrid = this.copyGrid();
    const policy = getPolicyFor(difficulty);
    const techniqueCap = techniqueCapFor(difficulty);

    let bestGrid = this.copyAnyGrid(puzzleGrid);
    let bestRemoved = 0;
    let bestRating = null;

    // Try multiple attempts to find a good puzzle
    // More retries for harder difficulties
    const maxRetries =
      difficulty === Difficulty.Expert || difficulty === Difficulty.Hard
        ? 8
        : 5;

    for (let retry = 0; retry < maxRetries; retry++) {
      const attemptGrid = this.copyGrid();
      let removed = 0;
      let attempts = 0;
      const maxAttempts = 150; // More attempts needed for technique-based generation

      // Create list of all positions
      const positions: [number, number][] = [];
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          positions.push([row, col]);
        }
      }

      // Shuffle positions for random removal
      const shuffledPositions = this.shuffleArray(positions);

      // Remove cells one by one, checking all constraints
      for (const [row, col] of shuffledPositions) {
        if (attempts >= maxAttempts) break;

        attempts++;

        // Store the original value
        const originalValue = attemptGrid[row][col];

        // Skip if cell is already empty
        if (originalValue === 0) continue;

        // Temporarily remove the cell
        attemptGrid[row][col] = 0;

        // Check 1: Uniqueness (existing fast backtracking solver)
        if (!this.hasUniqueSolution(attemptGrid)) {
          attemptGrid[row][col] = originalValue;
          continue;
        }

        // Check 2: Distribution guards (structural requirements)
        // Only enforce after we've removed a few cells
        if (removed > 10 && !meetsDistributionGuards(attemptGrid, policy)) {
          attemptGrid[row][col] = originalValue;
          continue;
        }

        // Check 3: Human solvability with technique cap
        const report = solveHuman(attemptGrid, techniqueCap);

        if (!report.solved) {
          // Cannot solve with allowed techniques
          attemptGrid[row][col] = originalValue;
          continue;
        }

        // Check 4: Initial singles requirement (relaxed)
        // Only check after we've removed enough cells to matter
        if (removed > 20 && report.initialSingles < policy.minInitialSingles) {
          attemptGrid[row][col] = originalValue;
          continue;
        }

        // Check 5: Difficulty rating (relaxed - allow easier puzzles)
        const rating = toRating(report);
        if (!isWithinBand(rating, difficulty)) {
          // Puzzle is too hard for this difficulty
          attemptGrid[row][col] = originalValue;
          continue;
        }

        // All checks passed - keep the cell removed
        removed++;
      }

      // Final re-rating to confirm difficulty
      const finalReport = solveHuman(attemptGrid);
      const finalRating = toRating(finalReport);

      // Keep the best attempt so far (prefer exact band matches, then more empty cells)
      const isExactBand = finalRating.band === difficulty;
      const prevExactBand = bestRating?.band === difficulty;

      const isBetterThanBest =
        // Prefer exact band matches over non-exact
        (isExactBand && !prevExactBand) ||
        // Among exact bands or non-exact bands, prefer more removed cells
        (isExactBand === prevExactBand && removed > bestRemoved);

      if (isBetterThanBest || bestRemoved === 0) {
        bestGrid = this.copyAnyGrid(attemptGrid);
        bestRemoved = removed;
        bestRating = finalRating;
      }

      // If we got an exact band match with good removal count, we can stop
      if (
        isExactBand &&
        removed >= 20 &&
        meetsDistributionGuards(attemptGrid, policy)
      ) {
        break;
      }
    }

    // Log the result with technique-based stats
    const emptyCells = bestRemoved;
    const givens = 81 - emptyCells;
    const filledPercent = Math.round((givens / 81) * 100);

    console.log(
      `✓ Generated ${difficulty} puzzle: ${givens} givens (${filledPercent}% filled), ` +
        `hardest technique: ${bestRating?.hardest || "None"}, ` +
        `rated as: ${bestRating?.band || "Unknown"}`
    );

    return bestGrid;
  }

  // Generate a complete Sudoku puzzle
  public generatePuzzle(
    difficulty: Difficulty = Difficulty.Medium
  ): SudokuPuzzle {
    // Reset grid
    this.grid = Array(9)
      .fill(null)
      .map(() => Array(9).fill(0));

    // Fill with complete solution
    this.fillGrid();
    const solution = this.gridToString(this.grid);

    // Create puzzle by removing cells
    const puzzleGrid = this.removeCells(difficulty);
    const board = this.gridToString(puzzleGrid);

    return {
      board: board.replace(/0/g, "0"), // Keep zeros as placeholders for empty cells
      solution,
      difficulty,
    };
  }
}

// Export the generator function
export function generateSudokuPuzzle(
  difficulty: Difficulty = Difficulty.Medium
): SudokuPuzzle {
  const generator = new SudokuGenerator();
  return generator.generatePuzzle(difficulty);
}

// Generate a random board with random difficulty
function getRandomDifficulty(): Difficulty {
  const difficulties = [
    Difficulty.Easy,
    Difficulty.Medium,
    Difficulty.Hard,
    Difficulty.Expert,
  ];
  return difficulties[Math.floor(Math.random() * difficulties.length)];
}

// Export a random board that can be imported directly
export const randomBoard = generateSudokuPuzzle(getRandomDifficulty());

// Helper function to verify a puzzle has a unique solution
export function verifyPuzzleUniqueness(boardString: string): {
  isUnique: boolean;
  solutionCount: number;
} {
  const generator = new SudokuGenerator();

  // Convert string to grid
  const grid: number[][] = Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    grid[row][col] = parseInt(boardString[i]) || 0;
  }

  const solutionCount = generator.countSolutions(grid, 3); // Check up to 3 solutions
  return {
    isUnique: solutionCount === 1,
    solutionCount,
  };
}

// Helper function to format board for display
export function formatBoardForDisplay(boardString: string): string {
  const rows: string[] = [];
  for (let i = 0; i < 9; i++) {
    const row = boardString.slice(i * 9, (i + 1) * 9);
    const formattedRow = row
      .split("")
      .map((cell) => (cell === "0" ? "." : cell))
      .join(" ");
    rows.push(formattedRow);
  }
  return rows.join("\n");
}

// Test the generator and log results
if (typeof window === "undefined") {
  // Only run in Node.js environment
  console.log("Generating Sudoku Puzzles with Human-Style Rating...\n");

  // Generate puzzles for each difficulty
  const difficulties = [
    Difficulty.Easy,
    Difficulty.Medium,
    Difficulty.Hard,
    Difficulty.Expert,
  ];

  difficulties.forEach((difficulty) => {
    console.log(`\n${difficulty.toUpperCase()} PUZZLE:`);
    console.log("=".repeat(60));

    const puzzle = generateSudokuPuzzle(difficulty);

    console.log("\nPUZZLE (with blanks):");
    console.log(formatBoardForDisplay(puzzle.board));

    console.log("\nSOLUTION:");
    console.log(formatBoardForDisplay(puzzle.solution));

    console.log(`\nRaw board string (81 chars): ${puzzle.board}`);
    console.log(`Raw solution string (81 chars): ${puzzle.solution}`);
    console.log(`Target difficulty: ${puzzle.difficulty}`);

    // Count empty cells and givens
    const emptyCells = puzzle.board.split("0").length - 1;
    const givens = 81 - emptyCells;
    console.log(
      `Givens: ${givens}/81 (${Math.round((givens / 81) * 100)}% filled)`
    );

    // Verify uniqueness
    const verification = verifyPuzzleUniqueness(puzzle.board);
    console.log(
      `Uniqueness: ${verification.isUnique ? "✓ UNIQUE" : "✗ NOT UNIQUE"} (${
        verification.solutionCount
      } solution${verification.solutionCount !== 1 ? "s" : ""})`
    );

    // Rate the puzzle using human techniques
    const grid = stringToGrid(puzzle.board);
    const rating = ratePuzzle(grid);
    const report = solveHuman(grid);

    console.log(`\nHuman-Style Rating:`);
    console.log(`  Rated difficulty: ${rating.band}`);
    console.log(`  Hardest technique: ${rating.hardest || "None"}`);
    console.log(`  Difficulty score: ${rating.score}`);
    console.log(`  Initial singles: ${report.initialSingles}`);
    console.log(`  Total steps: ${report.steps}`);
    console.log(`  Technique counts:`);
    for (const [technique, count] of Object.entries(report.counts)) {
      if ((count as number) > 0) {
        console.log(`    ${technique}: ${count}`);
      }
    }
  });
}
