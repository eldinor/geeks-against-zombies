export function nextRandom(state: number): number {
  let value = state >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}
