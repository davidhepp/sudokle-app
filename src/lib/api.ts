export async function fetchPuzzle() {
  const response = await fetch("/api/today");
  const data = await response.json();
  return data;
}
