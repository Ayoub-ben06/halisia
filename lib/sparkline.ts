export function sparklinePoints(
  ticker: string,
  price: number,
  positive: boolean,
): number[] {
  let seed = ticker.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const points: number[] = [];

  for (let index = 0; index < 5; index++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const noise = ((seed % 100) / 100 - 0.5) * 0.04 * price;
    const trend =
      (positive ? 1 : -1) * (index - 2) * 0.008 * price;
    points.push(price + noise + trend);
  }

  points[4] = price;
  return points;
}
