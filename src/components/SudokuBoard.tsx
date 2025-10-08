"use client";
import { fetchPuzzle } from "@/lib/api";
import { useState, useEffect } from "react";
import { SkeletonBoard } from "./SkeletonBoard";

interface PuzzleData {
  board: string;
  difficulty: string;
}

export default function SudokuBoard() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPuzzle = async () => {
      try {
        setLoading(true);
        const puzzleData = await fetchPuzzle();
        setPuzzle(puzzleData);
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

  const cells = puzzle.board.split("");
  const selectedValue = selectedIndex !== null ? cells[selectedIndex] : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-2">
          Difficulty:{" "}
          <span className="font-semibold capitalize">{puzzle.difficulty}</span>
        </div>
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

            return (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`aspect-square w-full h-full flex items-center justify-center ${borders} ${highlight}`}
                aria-pressed={isSelected}
              >
                <span className="text-slate-800 text-xl font-semibold">
                  {cell === "0" ? "" : cell}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
