import { randomBoard } from "@/lib/board-generator";
import prisma from "@/lib/prisma";
export async function GET() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const puzzle = await prisma.puzzle.findUnique({
    where: {
      date: formattedDate,
    },
  });
  if (puzzle) {
    return Response.json({
      board: puzzle.board,
      difficulty: puzzle.difficulty,
    });
  }
  const newPuzzle = await prisma.puzzle.create({
    data: {
      board: randomBoard.board,
      solution: randomBoard.solution,
      difficulty: randomBoard.difficulty,
      date: formattedDate,
    },
  });
  return Response.json({
    board: newPuzzle.board,
    difficulty: newPuzzle.difficulty,
  });
}
