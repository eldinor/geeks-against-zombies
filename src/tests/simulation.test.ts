import { describe, expect, it } from "vitest";
import { stateHash } from "../game/hash";
import type { GameCommand } from "../game/model";
import { runReplay, type Replay } from "../game/replay";
import { createGame, restore, serialize, step } from "../game/simulation";

const commands: GameCommand[] = [
  { type: "place", tick: 1, playerId: 1, sequence: 0, row: 0, col: 1, kind: "hacker" },
  { type: "place", tick: 2, playerId: 1, sequence: 1, row: 1, col: 1, kind: "scientist" },
];
const replay: Replay = { version: 1, seed: 12345, configVersion: 1, commands };

describe("deterministic simulation", () => {
  it("repeats a 10,000 tick replay with the same hash", () =>
    expect(stateHash(runReplay(replay, 10_000))).toBe(stateHash(runReplay(replay, 10_000))));
  it("continues identically after serialization", () => {
    const a = createGame(77);
    for (let i = 0; i < 500; i += 1)
      step(
        a,
        commands.filter((command) => command.tick === a.tick + 1),
      );
    const b = restore(serialize(a));
    for (let i = 0; i < 500; i += 1) {
      step(a);
      step(b);
    }
    expect(stateHash(a)).toBe(stateHash(b));
  });
  it("rejects invalid placement without partial mutation", () => {
    const state = createGame(1);
    const before = state.energy;
    step(state, [{ type: "place", tick: 1, playerId: 1, sequence: 0, row: -1, col: 0, kind: "hacker" }]);
    expect(state.energy).toBe(before);
    expect(state.geeks).toHaveLength(0);
    expect(state.events[0]?.type).toBe("rejected");
  });
  it("moves a geek without charging energy", () => {
    const state = createGame(1);
    step(state, [{ type: "place", tick: 1, playerId: 1, sequence: 0, row: 2, col: 2, kind: "hacker" }]);
    const id = state.geeks[0]?.id;
    const energy = state.energy;
    expect(id).toBeDefined();
    step(state, [{ type: "move", tick: 2, playerId: 1, sequence: 1, entityId: id ?? -1, row: 3, col: 4 }]);
    expect(state.geeks[0]).toMatchObject({ row: 3, col: 4 });
    expect(state.energy).toBe(energy);
    expect(state.events[0]?.type).toBe("moved");
  });
  it("rejects moving onto an occupied tile atomically", () => {
    const state = createGame(1);
    step(state, [
      { type: "place", tick: 1, playerId: 1, sequence: 0, row: 1, col: 1, kind: "engineer" },
      { type: "place", tick: 1, playerId: 1, sequence: 1, row: 2, col: 2, kind: "scientist" },
    ]);
    const moving = state.geeks[0];
    expect(moving).toBeDefined();
    step(state, [{ type: "move", tick: 2, playerId: 1, sequence: 2, entityId: moving?.id ?? -1, row: 2, col: 2 }]);
    expect(state.geeks.find((geek) => geek.id === moving?.id)).toMatchObject({ row: 1, col: 1 });
    expect(state.events[0]).toMatchObject({ type: "rejected", reason: "Tile is occupied" });
  });
});
