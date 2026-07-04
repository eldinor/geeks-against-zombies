import { BASE_ENERGY, CELL, COLS, GEEK, LAST_WAVE_TICK, WAVES, ZOMBIE } from "./config";
import type { GameCommand, GameEvent, GameState, Geek, Zombie } from "./model";

export function createGame(seed = 0xc0ffee): GameState {
  const normalized = seed >>> 0 || 1;
  return {
    version: 1,
    configVersion: 1,
    seed: normalized,
    randomState: normalized,
    tick: 0,
    nextId: 1,
    energy: BASE_ENERGY,
    score: 0,
    status: "playing",
    waveIndex: 0,
    geeks: [],
    zombies: [],
    projectiles: [],
    events: [],
  };
}

function event(state: GameState, value: Omit<GameEvent, "tick">): void {
  state.events.push({ ...value, tick: state.tick });
}
function sorted<T extends { id: number }>(values: T[]): T[] {
  return values.sort((a, b) => a.id - b.id);
}

function applyCommand(state: GameState, command: GameCommand): void {
  if (command.type === "move") {
    const geek = state.geeks.find((item) => item.id === command.entityId);
    const invalid = !geek
      ? "That geek is no longer available"
      : command.row < 0 || command.row >= 5 || command.col < 0 || command.col >= COLS
        ? "Tile is outside the board"
        : state.geeks.some(
              (item) => item.id !== command.entityId && item.row === command.row && item.col === command.col,
            )
          ? "Tile is occupied"
          : geek.row === command.row && geek.col === command.col
            ? "Geek is already on that tile"
            : undefined;
    if (invalid || !geek) {
      event(state, { type: "rejected", entityId: command.entityId, reason: invalid });
      return;
    }
    geek.row = command.row;
    geek.col = command.col;
    event(state, { type: "moved", entityId: geek.id });
    return;
  }
  const spec = GEEK[command.kind];
  const invalid =
    command.row < 0 || command.row >= 5 || command.col < 0 || command.col >= COLS
      ? "Tile is outside the board"
      : state.geeks.some((geek) => geek.row === command.row && geek.col === command.col)
        ? "Tile is occupied"
        : state.energy < spec.cost
          ? "Not enough energy"
          : undefined;
  if (invalid) {
    event(state, { type: "rejected", reason: invalid });
    return;
  }
  const geek: Geek = {
    id: state.nextId++,
    kind: command.kind,
    row: command.row,
    col: command.col,
    hp: spec.hp,
    cooldown: spec.cooldown,
  };
  state.energy -= spec.cost;
  state.geeks.push(geek);
  event(state, { type: "placed", entityId: geek.id });
}

function spawn(state: GameState): void {
  while (state.waveIndex < WAVES.length && WAVES[state.waveIndex]?.tick === state.tick) {
    const item = WAVES[state.waveIndex];
    if (!item) break;
    const zombie: Zombie = {
      id: state.nextId++,
      kind: item.kind,
      row: item.row,
      x: COLS * CELL + 600,
      hp: ZOMBIE[item.kind].hp,
      cooldown: 0,
    };
    state.zombies.push(zombie);
    state.waveIndex += 1;
    event(state, { type: "spawned", entityId: zombie.id });
  }
}

export function step(state: GameState, commands: readonly GameCommand[] = []): GameState {
  if (state.status !== "playing") {
    state.events = [];
    return state;
  }
  state.tick += 1;
  state.events = [];
  [...commands]
    .filter((command) => command.tick === state.tick)
    .sort((a, b) => a.tick - b.tick || a.playerId - b.playerId || a.sequence - b.sequence)
    .forEach((command) => applyCommand(state, command));
  spawn(state);
  for (const geek of sorted(state.geeks)) {
    geek.cooldown -= 1;
    if (geek.kind === "scientist" && geek.cooldown <= 0) {
      state.energy += 25;
      geek.cooldown = GEEK.scientist.cooldown;
    }
    if (
      geek.kind === "hacker" &&
      geek.cooldown <= 0 &&
      state.zombies.some((zombie) => zombie.row === geek.row && zombie.x > geek.col * CELL)
    ) {
      state.projectiles.push({ id: state.nextId++, row: geek.row, x: geek.col * CELL + 500, damage: 35 });
      geek.cooldown = GEEK.hacker.cooldown;
    }
  }
  for (const projectile of sorted(state.projectiles)) projectile.x += 120;
  const spent = new Set<number>();
  for (const projectile of sorted(state.projectiles)) {
    const target = sorted(state.zombies).find(
      (zombie) => zombie.row === projectile.row && zombie.x >= projectile.x && zombie.x - projectile.x <= 180,
    );
    if (target) {
      target.hp -= projectile.damage;
      spent.add(projectile.id);
      event(state, { type: "hit", entityId: target.id });
    }
  }
  state.projectiles = state.projectiles.filter(
    (projectile) => !spent.has(projectile.id) && projectile.x < (COLS + 1) * CELL,
  );
  for (const zombie of sorted(state.zombies)) {
    const blocker = sorted(state.geeks).find(
      (geek) => geek.row === zombie.row && zombie.x >= geek.col * CELL && zombie.x - geek.col * CELL <= 650,
    );
    if (blocker) {
      zombie.cooldown -= 1;
      if (zombie.cooldown <= 0) {
        blocker.hp -= ZOMBIE[zombie.kind].damage;
        zombie.cooldown = ZOMBIE[zombie.kind].cooldown;
      }
    } else zombie.x -= ZOMBIE[zombie.kind].speed;
  }
  for (const zombie of state.zombies.filter((item) => item.hp <= 0)) {
    state.score += ZOMBIE[zombie.kind].score;
    event(state, { type: "destroyed", entityId: zombie.id });
  }
  state.geeks = sorted(state.geeks.filter((geek) => geek.hp > 0));
  state.zombies = sorted(state.zombies.filter((zombie) => zombie.hp > 0));
  if (state.zombies.some((zombie) => zombie.x < -300)) {
    state.status = "lost";
    event(state, { type: "status", reason: "lost" });
  } else if (state.tick > LAST_WAVE_TICK && state.waveIndex === WAVES.length && state.zombies.length === 0) {
    state.status = "won";
    event(state, { type: "status", reason: "won" });
  }
  return state;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}
export function restore(value: string): GameState {
  return JSON.parse(value) as GameState;
}
