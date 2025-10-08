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
      id: puzzle.id,
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
    id: newPuzzle.id,
    board: newPuzzle.board,
    difficulty: newPuzzle.difficulty,
  });
}

export async function POST(request: Request) {
  const { solution } = await request.json();
  const puzzle = await prisma.puzzle.findFirst({
    where: {
      solution,
    },
  });
  if (puzzle) {
    return Response.json(
      {
        id: puzzle.id,
        isCorrect: solution === puzzle.solution,
      },
      { status: 200 }
    );
  }
  return Response.json(
    {
      error: "Wrong solution",
    },
    { status: 400 }
  );
}
