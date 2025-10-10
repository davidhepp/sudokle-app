/**
 * Shared types for Sudoku puzzle generation and solving
 */

export enum Difficulty {
  Easy = "Easy",
  Medium = "Medium",
  Hard = "Hard",
  Expert = "Expert",
}

export interface SudokuPuzzle {
  board: string; // 81 characters, '0' for empty cells
  solution: string; // 81 characters, complete solution
  difficulty: Difficulty;
}
