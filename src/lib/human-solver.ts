/**
 * Human-style Sudoku solver using logical techniques
 * No guessing or backtracking - only deterministic strategies
 */

import {
  type CandidateGrid,
  buildCandidates,
  cellKey,
  cellsInBox,
  getAllUnits,
  place,
  eliminate,
  cloneGrid,
  countEmptyCells,
  getBox,
} from "./candidates";

export type Technique =
  | "NakedSingle"
  | "HiddenSingle"
  | "LockedCandidate"
  | "NakedPair"
  | "HiddenPair"
  | "NakedTriple"
  | "HiddenTriple"
  | "XWing"
  | "XYWing";

export interface SolveReport {
  solved: boolean;
  steps: number;
  hardest: Technique | null;
  counts: Record<Technique, number>;
  initialSingles: number;
}

/**
 * Technique difficulty ordering (lower = easier)
 */
const TECHNIQUE_ORDER: Record<Technique, number> = {
  NakedSingle: 1,
  HiddenSingle: 2,
  LockedCandidate: 3,
  NakedPair: 4,
  HiddenPair: 5,
  NakedTriple: 6,
  HiddenTriple: 7,
  XWing: 8,
  XYWing: 9,
};

/**
 * Compare two techniques to determine which is harder
 */
function isHarderThan(a: Technique | null, b: Technique | null): boolean {
  if (!b) return true;
  if (!a) return false;
  return TECHNIQUE_ORDER[a] > TECHNIQUE_ORDER[b];
}

/**
 * Find all Naked Singles: cells with exactly one candidate
 * This is the simplest technique - if a cell has only one possible value, place it
 */
function findNakedSingles(
  grid: number[][],
  candidates: CandidateGrid
): Array<{ row: number; col: number; num: number }> {
  const singles: Array<{ row: number; col: number; num: number }> = [];

  for (const [key, candidateSet] of candidates.entries()) {
    if (candidateSet.size === 1) {
      const [row, col] = key.split(",").map(Number);
      const num = Array.from(candidateSet)[0];
      singles.push({ row, col, num });
    }
  }

  return singles;
}

/**
 * Find all Hidden Singles: digits that can only go in one place in a unit
 * Check each row, column, and box for digits that appear in only one cell's candidates
 */
function findHiddenSingles(
  grid: number[][],
  candidates: CandidateGrid
): Array<{ row: number; col: number; num: number }> {
  const singles: Array<{ row: number; col: number; num: number }> = [];
  const units = getAllUnits();

  for (const unit of units) {
    // For each digit 1-9, check where it can go in this unit
    for (let digit = 1; digit <= 9; digit++) {
      const possibleCells: Array<[number, number]> = [];

      for (const [row, col] of unit) {
        if (grid[row][col] === 0) {
          const key = cellKey(row, col);
          const cellCandidates = candidates.get(key);
          if (cellCandidates?.has(digit)) {
            possibleCells.push([row, col]);
          }
        }
      }

      // If digit can only go in one cell, it's a hidden single
      if (possibleCells.length === 1) {
        const [row, col] = possibleCells[0];
        singles.push({ row, col, num: digit });
      }
    }
  }

  return singles;
}

/**
 * Find Locked Candidates (Pointing and Claiming)
 * - Pointing: if all candidates for a digit in a box lie in one row/col,
 *   eliminate that digit from the rest of that row/col
 * - Claiming: if all candidates for a digit in a row/col lie in one box,
 *   eliminate that digit from the rest of that box
 */
function findLockedCandidates(
  grid: number[][],
  candidates: CandidateGrid
): Array<{ row: number; col: number; num: number }> {
  const eliminations: Array<{ row: number; col: number; num: number }> = [];

  // Pointing: check each box
  for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
    const boxCells = cellsInBox(boxIdx);

    for (let digit = 1; digit <= 9; digit++) {
      const cellsWithDigit: Array<[number, number]> = [];

      for (const [row, col] of boxCells) {
        if (grid[row][col] === 0) {
          const key = cellKey(row, col);
          if (candidates.get(key)?.has(digit)) {
            cellsWithDigit.push([row, col]);
          }
        }
      }

      if (cellsWithDigit.length > 1) {
        // Check if all are in the same row
        const rows = new Set(cellsWithDigit.map(([r]) => r));
        if (rows.size === 1) {
          const row = Array.from(rows)[0];
          // Eliminate from rest of row outside this box
          for (let col = 0; col < 9; col++) {
            if (getBox(row, col) !== boxIdx) {
              const key = cellKey(row, col);
              if (candidates.get(key)?.has(digit)) {
                eliminations.push({ row, col, num: digit });
              }
            }
          }
        }

        // Check if all are in the same column
        const cols = new Set(cellsWithDigit.map(([, c]) => c));
        if (cols.size === 1) {
          const col = Array.from(cols)[0];
          // Eliminate from rest of column outside this box
          for (let row = 0; row < 9; row++) {
            if (getBox(row, col) !== boxIdx) {
              const key = cellKey(row, col);
              if (candidates.get(key)?.has(digit)) {
                eliminations.push({ row, col, num: digit });
              }
            }
          }
        }
      }
    }
  }

  // Claiming: check each row
  for (let row = 0; row < 9; row++) {
    for (let digit = 1; digit <= 9; digit++) {
      const cellsWithDigit: Array<[number, number]> = [];

      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const key = cellKey(row, col);
          if (candidates.get(key)?.has(digit)) {
            cellsWithDigit.push([row, col]);
          }
        }
      }

      if (cellsWithDigit.length > 1) {
        const boxes = new Set(cellsWithDigit.map(([r, c]) => getBox(r, c)));
        if (boxes.size === 1) {
          const boxIdx = Array.from(boxes)[0];
          // Eliminate from rest of box
          for (const [r, c] of cellsInBox(boxIdx)) {
            if (r !== row) {
              const key = cellKey(r, c);
              if (candidates.get(key)?.has(digit)) {
                eliminations.push({ row: r, col: c, num: digit });
              }
            }
          }
        }
      }
    }
  }

  // Claiming: check each column
  for (let col = 0; col < 9; col++) {
    for (let digit = 1; digit <= 9; digit++) {
      const cellsWithDigit: Array<[number, number]> = [];

      for (let row = 0; row < 9; row++) {
        if (grid[row][col] === 0) {
          const key = cellKey(row, col);
          if (candidates.get(key)?.has(digit)) {
            cellsWithDigit.push([row, col]);
          }
        }
      }

      if (cellsWithDigit.length > 1) {
        const boxes = new Set(cellsWithDigit.map(([r, c]) => getBox(r, c)));
        if (boxes.size === 1) {
          const boxIdx = Array.from(boxes)[0];
          // Eliminate from rest of box
          for (const [r, c] of cellsInBox(boxIdx)) {
            if (c !== col) {
              const key = cellKey(r, c);
              if (candidates.get(key)?.has(digit)) {
                eliminations.push({ row: r, col: c, num: digit });
              }
            }
          }
        }
      }
    }
  }

  return eliminations;
}

/**
 * Find Naked Pairs: two cells in a unit that share the same two candidates
 * Those two digits can be eliminated from other cells in the unit
 */
function findNakedPairs(
  candidates: CandidateGrid
): Array<{ row: number; col: number; num: number }> {
  const eliminations: Array<{ row: number; col: number; num: number }> = [];
  const units = getAllUnits();

  for (const unit of units) {
    const cellsInUnit = unit.map(([r, c]) => ({
      row: r,
      col: c,
      key: cellKey(r, c),
      candidates: candidates.get(cellKey(r, c)),
    }));

    // Find cells with exactly 2 candidates
    const pairCells = cellsInUnit.filter((c) => c.candidates?.size === 2);

    // Check each pair of cells
    for (let i = 0; i < pairCells.length; i++) {
      for (let j = i + 1; j < pairCells.length; j++) {
        const cell1 = pairCells[i];
        const cell2 = pairCells[j];

        // Check if they have the same candidates
        const cands1 = Array.from(cell1.candidates!).sort();
        const cands2 = Array.from(cell2.candidates!).sort();

        if (
          cands1.length === 2 &&
          cands1[0] === cands2[0] &&
          cands1[1] === cands2[1]
        ) {
          // Found a naked pair! Eliminate these digits from other cells
          const [digit1, digit2] = cands1;

          for (const cell of cellsInUnit) {
            if (
              cell.key !== cell1.key &&
              cell.key !== cell2.key &&
              cell.candidates
            ) {
              if (cell.candidates.has(digit1)) {
                eliminations.push({
                  row: cell.row,
                  col: cell.col,
                  num: digit1,
                });
              }
              if (cell.candidates.has(digit2)) {
                eliminations.push({
                  row: cell.row,
                  col: cell.col,
                  num: digit2,
                });
              }
            }
          }
        }
      }
    }
  }

  return eliminations;
}

/**
 * Find Hidden Pairs: two digits that appear in exactly the same two cells in a unit
 * Those cells can have all other candidates eliminated
 */
function findHiddenPairs(
  candidates: CandidateGrid
): Array<{ row: number; col: number; num: number }> {
  const eliminations: Array<{ row: number; col: number; num: number }> = [];
  const units = getAllUnits();

  for (const unit of units) {
    // For each pair of digits, find where they appear
    for (let digit1 = 1; digit1 <= 8; digit1++) {
      for (let digit2 = digit1 + 1; digit2 <= 9; digit2++) {
        const cellsWithDigit1: Array<[number, number]> = [];
        const cellsWithDigit2: Array<[number, number]> = [];

        for (const [row, col] of unit) {
          const key = cellKey(row, col);
          const cellCands = candidates.get(key);
          if (cellCands) {
            if (cellCands.has(digit1)) cellsWithDigit1.push([row, col]);
            if (cellCands.has(digit2)) cellsWithDigit2.push([row, col]);
          }
        }

        // Check if both digits appear in exactly the same 2 cells
        if (
          cellsWithDigit1.length === 2 &&
          cellsWithDigit2.length === 2 &&
          cellsWithDigit1[0][0] === cellsWithDigit2[0][0] &&
          cellsWithDigit1[0][1] === cellsWithDigit2[0][1] &&
          cellsWithDigit1[1][0] === cellsWithDigit2[1][0] &&
          cellsWithDigit1[1][1] === cellsWithDigit2[1][1]
        ) {
          // Found a hidden pair! Remove all other candidates from these cells
          for (const [row, col] of cellsWithDigit1) {
            const key = cellKey(row, col);
            const cellCands = candidates.get(key);
            if (cellCands) {
              for (const digit of cellCands) {
                if (digit !== digit1 && digit !== digit2) {
                  eliminations.push({ row, col, num: digit });
                }
              }
            }
          }
        }
      }
    }
  }

  return eliminations;
}

/**
 * Find Naked Triples: three cells in a unit that together contain only three candidates
 * Those three digits can be eliminated from other cells in the unit
 */
function findNakedTriples(
  candidates: CandidateGrid
): Array<{ row: number; col: number; num: number }> {
  const eliminations: Array<{ row: number; col: number; num: number }> = [];
  const units = getAllUnits();

  for (const unit of units) {
    const cellsInUnit = unit.map(([r, c]) => ({
      row: r,
      col: c,
      key: cellKey(r, c),
      candidates: candidates.get(cellKey(r, c)),
    }));

    // Find cells with 2 or 3 candidates
    const tripleCells = cellsInUnit.filter(
      (c) => c.candidates && c.candidates.size >= 2 && c.candidates.size <= 3
    );

    // Check each combination of 3 cells
    for (let i = 0; i < tripleCells.length - 2; i++) {
      for (let j = i + 1; j < tripleCells.length - 1; j++) {
        for (let k = j + 1; k < tripleCells.length; k++) {
          const cell1 = tripleCells[i];
          const cell2 = tripleCells[j];
          const cell3 = tripleCells[k];

          // Combine all candidates from these three cells
          const combined = new Set([
            ...cell1.candidates!,
            ...cell2.candidates!,
            ...cell3.candidates!,
          ]);

          // If they contain exactly 3 digits total, it's a naked triple
          if (combined.size === 3) {
            const tripleDigits = Array.from(combined);

            // Eliminate these digits from other cells
            for (const cell of cellsInUnit) {
              if (
                cell.key !== cell1.key &&
                cell.key !== cell2.key &&
                cell.key !== cell3.key &&
                cell.candidates
              ) {
                for (const digit of tripleDigits) {
                  if (cell.candidates.has(digit)) {
                    eliminations.push({
                      row: cell.row,
                      col: cell.col,
                      num: digit,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return eliminations;
}

/**
 * Find Hidden Triples: three digits that appear in exactly the same three cells in a unit
 * Those cells can have all other candidates eliminated
 */
function findHiddenTriples(
  candidates: CandidateGrid
): Array<{ row: number; col: number; num: number }> {
  const eliminations: Array<{ row: number; col: number; num: number }> = [];
  const units = getAllUnits();

  for (const unit of units) {
    // For each combination of 3 digits, find where they appear
    for (let d1 = 1; d1 <= 7; d1++) {
      for (let d2 = d1 + 1; d2 <= 8; d2++) {
        for (let d3 = d2 + 1; d3 <= 9; d3++) {
          const cellsWithDigits = new Map<number, Array<[number, number]>>();
          cellsWithDigits.set(d1, []);
          cellsWithDigits.set(d2, []);
          cellsWithDigits.set(d3, []);

          for (const [row, col] of unit) {
            const key = cellKey(row, col);
            const cellCands = candidates.get(key);
            if (cellCands) {
              if (cellCands.has(d1)) cellsWithDigits.get(d1)!.push([row, col]);
              if (cellCands.has(d2)) cellsWithDigits.get(d2)!.push([row, col]);
              if (cellCands.has(d3)) cellsWithDigits.get(d3)!.push([row, col]);
            }
          }

          // Combine all cells where any of these digits appear
          const allCells = new Set<string>();
          for (const cells of cellsWithDigits.values()) {
            for (const [row, col] of cells) {
              allCells.add(cellKey(row, col));
            }
          }

          // If all three digits appear in exactly the same 3 cells, it's a hidden triple
          if (
            allCells.size === 3 &&
            cellsWithDigits.get(d1)!.length >= 2 &&
            cellsWithDigits.get(d2)!.length >= 2 &&
            cellsWithDigits.get(d3)!.length >= 2
          ) {
            // Check if each digit appears in a subset of these 3 cells
            const cellArray = Array.from(allCells).map((k) => {
              const [r, c] = k.split(",").map(Number);
              return [r, c] as [number, number];
            });

            let isHiddenTriple = true;
            for (const digit of [d1, d2, d3]) {
              const digitCells = cellsWithDigits.get(digit)!;
              for (const [row, col] of digitCells) {
                if (!allCells.has(cellKey(row, col))) {
                  isHiddenTriple = false;
                  break;
                }
              }
            }

            if (isHiddenTriple) {
              // Remove all other candidates from these three cells
              for (const [row, col] of cellArray) {
                const key = cellKey(row, col);
                const cellCands = candidates.get(key);
                if (cellCands) {
                  for (const digit of cellCands) {
                    if (digit !== d1 && digit !== d2 && digit !== d3) {
                      eliminations.push({ row, col, num: digit });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return eliminations;
}

/**
 * Find X-Wing: when a candidate appears in exactly 2 cells in 2 rows (or columns),
 * and those cells align in the same 2 columns (or rows), we can eliminate
 * that candidate from other cells in those columns (or rows)
 */
function findXWing(
  candidates: CandidateGrid
): Array<{ row: number; col: number; num: number }> {
  const eliminations: Array<{ row: number; col: number; num: number }> = [];

  for (let digit = 1; digit <= 9; digit++) {
    // Row-based X-Wing
    const rowsWithTwo: Array<{ row: number; cols: number[] }> = [];

    for (let row = 0; row < 9; row++) {
      const cols: number[] = [];
      for (let col = 0; col < 9; col++) {
        const key = cellKey(row, col);
        if (candidates.get(key)?.has(digit)) {
          cols.push(col);
        }
      }
      if (cols.length === 2) {
        rowsWithTwo.push({ row, cols });
      }
    }

    // Find two rows with the same two columns
    for (let i = 0; i < rowsWithTwo.length - 1; i++) {
      for (let j = i + 1; j < rowsWithTwo.length; j++) {
        const r1 = rowsWithTwo[i];
        const r2 = rowsWithTwo[j];

        if (r1.cols[0] === r2.cols[0] && r1.cols[1] === r2.cols[1]) {
          // Found X-Wing! Eliminate from these columns
          const [col1, col2] = r1.cols;

          for (let row = 0; row < 9; row++) {
            if (row !== r1.row && row !== r2.row) {
              for (const col of [col1, col2]) {
                const key = cellKey(row, col);
                if (candidates.get(key)?.has(digit)) {
                  eliminations.push({ row, col, num: digit });
                }
              }
            }
          }
        }
      }
    }

    // Column-based X-Wing
    const colsWithTwo: Array<{ col: number; rows: number[] }> = [];

    for (let col = 0; col < 9; col++) {
      const rows: number[] = [];
      for (let row = 0; row < 9; row++) {
        const key = cellKey(row, col);
        if (candidates.get(key)?.has(digit)) {
          rows.push(row);
        }
      }
      if (rows.length === 2) {
        colsWithTwo.push({ col, rows });
      }
    }

    // Find two columns with the same two rows
    for (let i = 0; i < colsWithTwo.length - 1; i++) {
      for (let j = i + 1; j < colsWithTwo.length; j++) {
        const c1 = colsWithTwo[i];
        const c2 = colsWithTwo[j];

        if (c1.rows[0] === c2.rows[0] && c1.rows[1] === c2.rows[1]) {
          // Found X-Wing! Eliminate from these rows
          const [row1, row2] = c1.rows;

          for (let col = 0; col < 9; col++) {
            if (col !== c1.col && col !== c2.col) {
              for (const row of [row1, row2]) {
                const key = cellKey(row, col);
                if (candidates.get(key)?.has(digit)) {
                  eliminations.push({ row, col, num: digit });
                }
              }
            }
          }
        }
      }
    }
  }

  return eliminations;
}

/**
 * Find XY-Wing: a forcing chain pattern with three cells
 * Cell A has candidates XY, Cell B has XZ, Cell C has YZ
 * If B and C both see A, and they also see a common cell D,
 * then D cannot be Z
 */
function findXYWing(
  candidates: CandidateGrid
): Array<{ row: number; col: number; num: number }> {
  const eliminations: Array<{ row: number; col: number; num: number }> = [];

  // Find all cells with exactly 2 candidates (potential pivot and wings)
  const biValueCells: Array<{ row: number; col: number; cands: number[] }> = [];

  for (const [key, cands] of candidates.entries()) {
    if (cands.size === 2) {
      const [row, col] = key.split(",").map(Number);
      biValueCells.push({ row, col, cands: Array.from(cands) });
    }
  }

  // Check each cell as potential pivot
  for (const pivot of biValueCells) {
    // Find potential wings (cells that see pivot and share one candidate)
    const potentialWings = biValueCells.filter((cell) => {
      if (cell.row === pivot.row && cell.col === pivot.col) return false;

      // Check if cell sees pivot (same row, col, or box)
      const sameRow = cell.row === pivot.row;
      const sameCol = cell.col === pivot.col;
      const sameBox =
        getBox(cell.row, cell.col) === getBox(pivot.row, pivot.col);

      if (!sameRow && !sameCol && !sameBox) return false;

      // Check if it shares exactly one candidate with pivot
      const shared = cell.cands.filter((c) => pivot.cands.includes(c));
      return shared.length === 1;
    });

    // Find pairs of wings that form XY-Wing pattern
    for (let i = 0; i < potentialWings.length - 1; i++) {
      for (let j = i + 1; j < potentialWings.length; j++) {
        const wing1 = potentialWings[i];
        const wing2 = potentialWings[j];

        // Check if wings have one common candidate not in pivot
        const wing1Other = wing1.cands.find((c) => !pivot.cands.includes(c));
        const wing2Other = wing2.cands.find((c) => !pivot.cands.includes(c));

        if (wing1Other === wing2Other) {
          const z = wing1Other!;

          // Find cells that see both wings
          for (const [key, cands] of candidates.entries()) {
            if (cands.has(z)) {
              const [row, col] = key.split(",").map(Number);

              // Check if this cell sees both wings
              const seesWing1 =
                row === wing1.row ||
                col === wing1.col ||
                getBox(row, col) === getBox(wing1.row, wing1.col);

              const seesWing2 =
                row === wing2.row ||
                col === wing2.col ||
                getBox(row, col) === getBox(wing2.row, wing2.col);

              if (
                seesWing1 &&
                seesWing2 &&
                !(row === wing1.row && col === wing1.col) &&
                !(row === wing2.row && col === wing2.col)
              ) {
                eliminations.push({ row, col, num: z });
              }
            }
          }
        }
      }
    }
  }

  return eliminations;
}

/**
 * Solve a Sudoku puzzle using human-style techniques
 *
 * This solver uses only deterministic logical techniques that a human would use,
 * in order from easiest to hardest. No guessing or backtracking is performed.
 *
 * The solver applies techniques in this order:
 * 1. Naked Singles - cells with only one candidate
 * 2. Hidden Singles - digits that can only go in one place in a unit
 * 3. Locked Candidates - pointing and claiming eliminations
 * 4. Naked Pairs - two cells sharing same two candidates
 * 5. Hidden Pairs - two digits appearing in same two cells
 * 6. Naked Triples - three cells sharing three candidates
 * 7. Hidden Triples - three digits in same three cells
 * 8. X-Wing - fish pattern for eliminations
 * 9. XY-Wing - forcing chain pattern
 *
 * @param initialGrid - A 9x9 grid with numbers 1-9 (0 for empty cells)
 * @param maxTechnique - Optional cap on hardest technique to use (for difficulty rating)
 * @returns A report with solving statistics and technique usage
 *
 * @example
 * ```ts
 * const grid = stringToGrid("003020600...");
 * const report = solveHuman(grid, "NakedPair"); // Only use techniques up to Naked Pairs
 * if (report.solved) {
 *   console.log(`Solved in ${report.steps} steps`);
 *   console.log(`Hardest technique: ${report.hardest}`);
 * }
 * ```
 */
export function solveHuman(
  initialGrid: number[][],
  maxTechnique?: Technique
): SolveReport {
  const grid = cloneGrid(initialGrid);
  const candidates = buildCandidates(grid);

  const counts: Record<Technique, number> = {
    NakedSingle: 0,
    HiddenSingle: 0,
    LockedCandidate: 0,
    NakedPair: 0,
    HiddenPair: 0,
    NakedTriple: 0,
    HiddenTriple: 0,
    XWing: 0,
    XYWing: 0,
  };

  let hardest: Technique | null = null;
  let steps = 0;

  // Count initial singles (for rating)
  const initialNaked = findNakedSingles(grid, candidates).length;
  const initialHidden = findHiddenSingles(grid, candidates).length;
  const initialSingles = initialNaked + initialHidden;

  const maxOrder = maxTechnique ? TECHNIQUE_ORDER[maxTechnique] : 999;

  let progress = true;
  while (progress && countEmptyCells(grid) > 0) {
    progress = false;

    // Try Naked Singles
    if (TECHNIQUE_ORDER.NakedSingle <= maxOrder) {
      const nakedSingles = findNakedSingles(grid, candidates);
      if (nakedSingles.length > 0) {
        for (const { row, col, num } of nakedSingles) {
          place(grid, candidates, row, col, num);
          counts.NakedSingle++;
          steps++;
          if (isHarderThan("NakedSingle", hardest)) {
            hardest = "NakedSingle";
          }
        }
        progress = true;
        continue;
      }
    }

    // Try Hidden Singles
    if (TECHNIQUE_ORDER.HiddenSingle <= maxOrder) {
      const hiddenSingles = findHiddenSingles(grid, candidates);
      if (hiddenSingles.length > 0) {
        for (const { row, col, num } of hiddenSingles) {
          place(grid, candidates, row, col, num);
          counts.HiddenSingle++;
          steps++;
          if (isHarderThan("HiddenSingle", hardest)) {
            hardest = "HiddenSingle";
          }
        }
        progress = true;
        continue;
      }
    }

    // Try Locked Candidates
    if (TECHNIQUE_ORDER.LockedCandidate <= maxOrder) {
      const locked = findLockedCandidates(grid, candidates);
      if (locked.length > 0) {
        for (const { row, col, num } of locked) {
          eliminate(candidates, row, col, num);
          counts.LockedCandidate++;
          steps++;
          if (isHarderThan("LockedCandidate", hardest)) {
            hardest = "LockedCandidate";
          }
        }
        progress = true;
        continue;
      }
    }

    // Try Naked Pairs
    if (TECHNIQUE_ORDER.NakedPair <= maxOrder) {
      const nakedPairs = findNakedPairs(candidates);
      if (nakedPairs.length > 0) {
        for (const { row, col, num } of nakedPairs) {
          eliminate(candidates, row, col, num);
          counts.NakedPair++;
          steps++;
          if (isHarderThan("NakedPair", hardest)) {
            hardest = "NakedPair";
          }
        }
        progress = true;
        continue;
      }
    }

    // Try Hidden Pairs
    if (TECHNIQUE_ORDER.HiddenPair <= maxOrder) {
      const hiddenPairs = findHiddenPairs(candidates);
      if (hiddenPairs.length > 0) {
        for (const { row, col, num } of hiddenPairs) {
          eliminate(candidates, row, col, num);
          counts.HiddenPair++;
          steps++;
          if (isHarderThan("HiddenPair", hardest)) {
            hardest = "HiddenPair";
          }
        }
        progress = true;
        continue;
      }
    }

    // Try Naked Triples
    if (TECHNIQUE_ORDER.NakedTriple <= maxOrder) {
      const nakedTriples = findNakedTriples(candidates);
      if (nakedTriples.length > 0) {
        for (const { row, col, num } of nakedTriples) {
          eliminate(candidates, row, col, num);
          counts.NakedTriple++;
          steps++;
          if (isHarderThan("NakedTriple", hardest)) {
            hardest = "NakedTriple";
          }
        }
        progress = true;
        continue;
      }
    }

    // Try Hidden Triples
    if (TECHNIQUE_ORDER.HiddenTriple <= maxOrder) {
      const hiddenTriples = findHiddenTriples(candidates);
      if (hiddenTriples.length > 0) {
        for (const { row, col, num } of hiddenTriples) {
          eliminate(candidates, row, col, num);
          counts.HiddenTriple++;
          steps++;
          if (isHarderThan("HiddenTriple", hardest)) {
            hardest = "HiddenTriple";
          }
        }
        progress = true;
        continue;
      }
    }

    // Try X-Wing
    if (TECHNIQUE_ORDER.XWing <= maxOrder) {
      const xwing = findXWing(candidates);
      if (xwing.length > 0) {
        for (const { row, col, num } of xwing) {
          eliminate(candidates, row, col, num);
          counts.XWing++;
          steps++;
          if (isHarderThan("XWing", hardest)) {
            hardest = "XWing";
          }
        }
        progress = true;
        continue;
      }
    }

    // Try XY-Wing
    if (TECHNIQUE_ORDER.XYWing <= maxOrder) {
      const xywing = findXYWing(candidates);
      if (xywing.length > 0) {
        for (const { row, col, num } of xywing) {
          eliminate(candidates, row, col, num);
          counts.XYWing++;
          steps++;
          if (isHarderThan("XYWing", hardest)) {
            hardest = "XYWing";
          }
        }
        progress = true;
        continue;
      }
    }
  }

  const solved = countEmptyCells(grid) === 0;

  return {
    solved,
    steps,
    hardest,
    counts,
    initialSingles,
  };
}
