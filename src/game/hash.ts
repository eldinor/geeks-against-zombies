import type { GameState } from "./model";

export function stateHash(state: GameState): string {
  const copy = { ...state, events: [] };
  const input = JSON.stringify(copy);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
