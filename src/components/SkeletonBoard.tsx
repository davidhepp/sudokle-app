export function SkeletonBoard() {
  // Create 81 skeleton cells for the 9x9 grid
  const skeletonCells = Array.from({ length: 81 }, (_, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;

    // Determine border thickness for each side (matching SudokuBoard logic)
    const isTopThick = row % 3 === 0;
    const isBottomThick = row === 8;
    const isLeftThick = col % 3 === 0;
    const isRightThick = col === 8;

    const topClass = isTopThick
      ? "border-t-2 border-t-slate-300"
      : "border-t-[0.5px] border-t-slate-200";
    const bottomClass = isBottomThick
      ? "border-b-2 border-b-slate-300"
      : "border-b-[0.5px] border-b-slate-200";
    const leftClass = isLeftThick
      ? "border-l-2 border-l-slate-300"
      : "border-l-[0.5px] border-l-slate-200";
    const rightClass = isRightThick
      ? "border-r-2 border-r-slate-300"
      : "border-r-[0.5px] border-r-slate-200";

    const borders = [topClass, bottomClass, leftClass, rightClass].join(" ");

    return (
      <div
        key={index}
        className={`aspect-square w-full h-full flex items-center justify-center bg-slate-50 ${borders}`}
      >
        <div className="animate-pulse rounded w-4 h-6"></div>
      </div>
    );
  });

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Skeleton for difficulty text */}
      <div className="text-center">
        <div className="animate-pulse bg-slate-200 rounded h-4 w-32 mb-2"></div>
      </div>

      {/* Skeleton Sudoku grid */}
      <div className="select-none" style={{ width: "min(90vw, 540px)" }}>
        <div
          className="grid bg-white"
          style={{
            gridTemplateColumns: "repeat(9, 1fr)",
            gridTemplateRows: "repeat(9, 1fr)",
          }}
        >
          {skeletonCells}
        </div>
      </div>
    </div>
  );
}
