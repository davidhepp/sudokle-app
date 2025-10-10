/**
 * Candidate tracking system for Sudoku solving
 * Maintains possible values (candidates) for each empty cell
 */

export type CandidateGrid = Map<string, Set<number>>;

/**
 * Generate a unique key for a cell position
 */
export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/**
 * Parse a cell key back into row and column
 */
export function parseKey(key: string): [number, number] {
  const [row, col] = key.split(",").map(Number);
  return [row, col];
}

/**
 * Get the 3x3 box index for a cell
 */
export function getBox(row: number, col: number): number {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

/**
 * Get all cell coordinates in a specific row
 */
export function cellsInRow(row: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let col = 0; col < 9; col++) {
    cells.push([row, col]);
  }
  return cells;
}

/**
 * Get all cell coordinates in a specific column
 */
export function cellsInCol(col: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let row = 0; row < 9; row++) {
    cells.push([row, col]);
  }
  return cells;
}

/**
 * Get all cell coordinates in a specific 3x3 box
 */
export function cellsInBox(boxIdx: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  const startRow = Math.floor(boxIdx / 3) * 3;
  const startCol = (boxIdx % 3) * 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push([startRow + r, startCol + c]);
    }
  }
  return cells;
}

/**
 * Get all cells that are peers of the given cell (same row, column, or box)
 */
export function getPeers(row: number, col: number): Array<[number, number]> {
  const peers = new Set<string>();

  // Add row peers
  for (let c = 0; c < 9; c++) {
    if (c !== col) peers.add(cellKey(row, c));
  }

  // Add column peers
  for (let r = 0; r < 9; r++) {
    if (r !== row) peers.add(cellKey(r, col));
  }

  // Add box peers
  const boxIdx = getBox(row, col);
  for (const [r, c] of cellsInBox(boxIdx)) {
    if (r !== row || c !== col) {
      peers.add(cellKey(r, c));
    }
  }

  return Array.from(peers).map(parseKey);
}

/**
 * Build initial candidate grid from a Sudoku puzzle
 * Each empty cell gets candidates 1-9 minus any numbers in its row/col/box
 */
export function buildCandidates(grid: number[][]): CandidateGrid {
  const candidates: CandidateGrid = new Map();

  // Initialize all empty cells with full candidate set
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        candidates.set(cellKey(row, col), new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
      }
    }
  }

  // Remove candidates based on existing filled cells
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const num = grid[row][col];
      if (num !== 0) {
        // Remove this number from all peers' candidates
        for (const [peerRow, peerCol] of getPeers(row, col)) {
          const key = cellKey(peerRow, peerCol);
          candidates.get(key)?.delete(num);
        }
      }
    }
  }

  return candidates;
}

/**
 * Place a number in the grid and update candidates accordingly
 * Returns true if placement was successful
 */
export function place(
  grid: number[][],
  candidates: CandidateGrid,
  row: number,
  col: number,
  num: number
): boolean {
  // Place the number
  grid[row][col] = num;

  // Remove candidates for this cell
  const key = cellKey(row, col);
  candidates.delete(key);

  // Remove this number from all peers' candidates
  for (const [peerRow, peerCol] of getPeers(row, col)) {
    eliminate(candidates, peerRow, peerCol, num);
  }

  return true;
}

/**
 * Remove a specific candidate from a cell
 */
export function eliminate(
  candidates: CandidateGrid,
  row: number,
  col: number,
  num: number
): boolean {
  const key = cellKey(row, col);
  const cellCandidates = candidates.get(key);

  if (cellCandidates) {
    cellCandidates.delete(num);
    return true;
  }

  return false;
}

/**
 * Clone a candidate grid for safe manipulation
 */
export function cloneCandidates(candidates: CandidateGrid): CandidateGrid {
  const cloned: CandidateGrid = new Map();

  for (const [key, candidateSet] of candidates.entries()) {
    cloned.set(key, new Set(candidateSet));
  }

  return cloned;
}

/**
 * Clone a grid
 */
export function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => [...row]);
}

/**
 * Count empty cells in the grid
 */
export function countEmptyCells(grid: number[][]): number {
  let count = 0;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) count++;
    }
  }
  return count;
}

/**
 * Get all units (rows, columns, boxes) as arrays of cell coordinates
 */
export function getAllUnits(): Array<Array<[number, number]>> {
  const units: Array<Array<[number, number]>> = [];

  // Add all rows
  for (let row = 0; row < 9; row++) {
    units.push(cellsInRow(row));
  }

  // Add all columns
  for (let col = 0; col < 9; col++) {
    units.push(cellsInCol(col));
  }

  // Add all boxes
  for (let box = 0; box < 9; box++) {
    units.push(cellsInBox(box));
  }

  return units;
}
