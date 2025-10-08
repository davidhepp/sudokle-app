"use client";
import { fetchPuzzle } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import { SkeletonBoard } from "./SkeletonBoard";
import { Eraser, Undo2 } from "lucide-react";
interface PuzzleData {
  id: string;
  board: string;
  difficulty: string;
}

interface SolutionResponse {
  id: string;
  isCorrect: boolean;
  error?: string;
}

export default function SudokuBoard() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userBoard, setUserBoard] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const [solutionResult, setSolutionResult] = useState<SolutionResponse | null>(
    null
  );
  const [boardHistory, setBoardHistory] = useState<string[]>([]);

  useEffect(() => {
    const loadPuzzle = async () => {
      try {
        setLoading(true);
        const puzzleData = await fetchPuzzle();
        setPuzzle(puzzleData);
        setUserBoard(puzzleData.board); // Initialize user board with puzzle data
        setError(null);
      } catch (err) {
        setError("Failed to load today's puzzle");
        console.error("Error fetching puzzle:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPuzzle();
  }, []);

  // Check if board is complete (no empty cells)
  const isBoardComplete = useCallback(() => {
    return userBoard && !userBoard.includes("0");
  }, [userBoard]);

  // Submit solution for validation
  const checkSolution = useCallback(async () => {
    if (!isBoardComplete()) return;

    try {
      setIsChecking(true);
      const response = await fetch("/api/today", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ solution: userBoard }),
      });

      const result = await response.json();
      setSolutionResult(result);
    } catch (err) {
      console.error("Error checking solution:", err);
      setSolutionResult({
        id: "",
        isCorrect: false,
        error: "Failed to check solution",
      });
    } finally {
      setIsChecking(false);
    }
  }, [userBoard, isBoardComplete]);

  // Auto-check solution when board is complete
  useEffect(() => {
    if (isBoardComplete() && !isChecking && !solutionResult) {
      checkSolution();
    }
  }, [isBoardComplete, isChecking, solutionResult, checkSolution]);

  // Handle number input
  const handleNumberInput = useCallback(
    (number: string) => {
      if (selectedIndex === null || !puzzle) return;

      // Don't allow editing pre-filled cells (original puzzle cells that aren't "0")
      const originalCell = puzzle.board[selectedIndex];
      if (originalCell !== "0") return;

      // Save current board state to history before making changes
      setBoardHistory((prev) => [...prev, userBoard]);

      const newBoard = userBoard.split("");
      newBoard[selectedIndex] = number;
      setUserBoard(newBoard.join(""));

      // Clear any previous solution result when user makes changes
      if (solutionResult) {
        setSolutionResult(null);
      }
    },
    [selectedIndex, puzzle, userBoard, solutionResult]
  );

  // Handle undo functionality
  const undoLastInput = useCallback(() => {
    if (boardHistory.length === 0) return;

    // Get the last board state from history
    const lastBoardState = boardHistory[boardHistory.length - 1];

    // Remove the last state from history
    setBoardHistory((prev) => prev.slice(0, -1));

    // Restore the board to the previous state
    setUserBoard(lastBoardState);

    // Clear any previous solution result when user makes changes
    if (solutionResult) {
      setSolutionResult(null);
    }
  }, [boardHistory, solutionResult]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (selectedIndex === null) return;

      const key = event.key;
      if (key >= "1" && key <= "9") {
        handleNumberInput(key);
      } else if (key === "Backspace" || key === "Delete" || key === "0") {
        handleNumberInput("0");
      } else if ((event.ctrlKey || event.metaKey) && key === "z") {
        // Add keyboard shortcut for undo (Ctrl+Z or Cmd+Z)
        event.preventDefault();
        undoLastInput();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedIndex, handleNumberInput, undoLastInput]);

  if (loading) {
    return <SkeletonBoard />;
  }

  if (error || !puzzle) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-lg text-red-600">
          {error || "No puzzle available"}
        </div>
      </div>
    );
  }

  const cells = userBoard.split("");
  const originalCells = puzzle.board.split("");
  const selectedValue = selectedIndex !== null ? cells[selectedIndex] : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-2">
          Difficulty:{" "}
          <span className="font-semibold capitalize">{puzzle.difficulty}</span>
          <span className="text-sm text-gray-600 ml-2">{puzzle.id}</span>
        </div>

        {/* Solution Result Display */}
        {isChecking && (
          <div className="text-sm text-blue-600 font-medium">
            Checking solution...
          </div>
        )}

        {solutionResult && (
          <div
            className={`text-sm font-medium ${
              solutionResult.isCorrect ? "text-green-600" : "text-red-600"
            }`}
          >
            {solutionResult.error
              ? solutionResult.error
              : solutionResult.isCorrect
              ? "🎉 Congratulations! Solution is correct!"
              : "❌ Solution is incorrect. Keep trying!"}
          </div>
        )}
      </div>
      <div className="select-none" style={{ width: "min(90vw, 540px)" }}>
        <div
          className="grid bg-white"
          style={{
            gridTemplateColumns: "repeat(9, 1fr)",
            gridTemplateRows: "repeat(9, 1fr)",
          }}
        >
          {cells.map((cell, index) => {
            const row = Math.floor(index / 9);
            const col = index % 9;
            const isSelected = selectedIndex === index;
            const selectedRow =
              selectedIndex !== null ? Math.floor(selectedIndex / 9) : null;
            const selectedCol =
              selectedIndex !== null ? selectedIndex % 9 : null;
            const inSelectedLine = selectedRow === row || selectedCol === col;

            // Same 3x3 box as the selected cell
            const boxRowStart =
              selectedRow !== null ? Math.floor(selectedRow / 3) * 3 : null;
            const boxColStart =
              selectedCol !== null ? Math.floor(selectedCol / 3) * 3 : null;
            const inSelectedBox =
              boxRowStart !== null &&
              boxColStart !== null &&
              row >= boxRowStart &&
              row < boxRowStart + 3 &&
              col >= boxColStart &&
              col < boxColStart + 3;

            // Same number highlighting
            const isSameNumber =
              selectedValue !== null &&
              selectedValue !== "0" &&
              cell === selectedValue;

            // Check if this is an original (pre-filled) cell
            const isOriginalCell = originalCells[index] !== "0";
            const isUserEnteredCell = !isOriginalCell && cell !== "0";

            // Determine border thickness and color for each side
            const isTopThick = row % 3 === 0;
            const isBottomThick = row === 8;
            const isLeftThick = col % 3 === 0;
            const isRightThick = col === 8;

            const topClass = isTopThick
              ? "border-t-2 border-t-slate-700"
              : "border-t-[0.5px] border-t-slate-300";
            const bottomClass = isBottomThick
              ? "border-b-2 border-b-slate-700"
              : "border-b-[0.5px] border-b-slate-300";
            const leftClass = isLeftThick
              ? "border-l-2 border-l-slate-700"
              : "border-l-[0.5px] border-l-slate-300";
            const rightClass = isRightThick
              ? "border-r-2 border-r-slate-700"
              : "border-r-[0.5px] border-r-slate-300";

            const borders = [topClass, bottomClass, leftClass, rightClass].join(
              " "
            );

            const highlight = isSelected
              ? "bg-blue-200"
              : isSameNumber
              ? "bg-blue-100"
              : inSelectedBox
              ? "bg-blue-50"
              : inSelectedLine
              ? "bg-blue-50"
              : "bg-white";

            // Different styling for original vs user-entered numbers
            const textColor = isOriginalCell
              ? "text-slate-800"
              : isUserEnteredCell
              ? "text-blue-600"
              : "text-slate-800";

            return (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`aspect-square w-full h-full flex items-center justify-center ${borders} ${highlight} cursor-pointer`}
                aria-pressed={isSelected}
              >
                <span className={`${textColor} text-3xl`}>
                  {cell === "0" ? "" : cell}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions and Number Input Panel */}
      <div className="text-center space-y-3">
        {/* Number Input Buttons */}
        <div className="flex justify-center gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberInput(num.toString())}
              disabled={
                selectedIndex === null ||
                (puzzle && originalCells[selectedIndex] !== "0")
              }
              className="w-10 h-10 text-2xl text-blue-500 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed font-semibold rounded transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleNumberInput("0")}
            disabled={
              selectedIndex === null ||
              (puzzle && originalCells[selectedIndex] !== "0")
            }
            className="w-10 h-10 text-2xl text-red-500 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed font-semibold rounded transition-colors flex items-center justify-center"
          >
            <Eraser className="w-6 h-6" />
          </button>
          <button
            onClick={() => undoLastInput()}
            disabled={boardHistory.length === 0}
            className="w-10 h-10 text-2xl text-blue-500 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed font-semibold rounded transition-colors flex items-center justify-center"
          >
            <Undo2 className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
