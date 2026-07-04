import type { GameCommand, GameState } from "./model";
import { createGame, step } from "./simulation";

export interface Replay {
  version: 1;
  seed: number;
  configVersion: 1;
  commands: GameCommand[];
}
export function runReplay(replay: Replay, ticks: number): GameState {
  const state = createGame(replay.seed);
  while (state.tick < ticks && state.status === "playing")
    step(
      state,
      replay.commands.filter((command) => command.tick === state.tick + 1),
    );
  return state;
}
