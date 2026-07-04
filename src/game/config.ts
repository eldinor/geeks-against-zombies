import type { GeekKind, ZombieKind } from "./model";

export const TICKS_PER_SECOND = 20;
export const ROWS = 5;
export const COLS = 9;
export const CELL = 1000;
export const BASE_ENERGY = 200;
export const GEEK = {
  hacker: { cost: 100, hp: 100, cooldown: 24 },
  engineer: { cost: 75, hp: 400, cooldown: 0 },
  scientist: { cost: 50, hp: 90, cooldown: 100 },
} satisfies Record<GeekKind, { cost: number; hp: number; cooldown: number }>;
export const ZOMBIE = {
  walker: { hp: 160, speed: 12, damage: 20, cooldown: 20, score: 50 },
  sprinter: { hp: 90, speed: 24, damage: 12, cooldown: 14, score: 75 },
} satisfies Record<ZombieKind, { hp: number; speed: number; damage: number; cooldown: number; score: number }>;
export interface Spawn {
  tick: number;
  row: number;
  kind: ZombieKind;
}
export const WAVES: Spawn[] = Array.from({ length: 36 }, (_, index) => ({
  tick: 80 + index * 55,
  row: (index * 3 + Math.floor(index / 5)) % ROWS,
  kind: index % 4 === 3 ? "sprinter" : "walker",
}));
export const LAST_WAVE_TICK = WAVES.at(-1)?.tick ?? 0;
