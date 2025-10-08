import SudokuBoard from "@/components/SudokuBoard";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <h1>Sudokle</h1>
      <SudokuBoard />
    </div>
  );
}
