import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("Flow Graph event wiring", () => {
  const source = readFileSync(fileURLToPath(new URL("../flow/create-game-graph.ts", import.meta.url)), "utf8");
  it("uses event-backed adapters directly", () => {
    expect(source).toContain("new AdvanceSimulationBlock(runtime, publish)");
    expect(source).toContain("new QueueCommandBlock(tiles, pick, hover)");
    expect(source).not.toContain(".out.connectTo");
  });
});
