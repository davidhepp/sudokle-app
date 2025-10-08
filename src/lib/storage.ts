/**
 * localStorage utilities for saving and loading Sudoku progress
 */

export interface SudokuProgress {
  puzzleId: string;
  userBoard: string;
  boardHistory: string[];
  date: string;
  isCompleted: boolean;
  solutionResult?: {
    id: string;
    isCorrect: boolean;
    error?: string;
  } | null;
}

const STORAGE_KEY = "sudokle_progress";

/**
 * Get today's date in the same format as the API
 */
export function getTodaysDate(): string {
  const today = new Date();
  return today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Save progress to localStorage
 */
export function saveProgress(progress: SudokuProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save progress to localStorage:", error);
  }
}

/**
 * Load progress from localStorage
 * Returns null if no progress exists or if it's from a different day
 */
export function loadProgress(): SudokuProgress | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const progress: SudokuProgress = JSON.parse(stored);
    const today = getTodaysDate();

    // If the stored progress is from a different day, clear it and return null
    if (progress.date !== today) {
      clearProgress();
      return null;
    }

    return progress;
  } catch (error) {
    console.error("Failed to load progress from localStorage:", error);
    // Clear corrupted data
    clearProgress();
    return null;
  }
}

/**
 * Clear progress from localStorage
 */
export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear progress from localStorage:", error);
  }
}

/**
 * Check if there's valid progress for today
 */
export function hasProgressForToday(): boolean {
  const progress = loadProgress();
  return progress !== null && progress.date === getTodaysDate();
}
