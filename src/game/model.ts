export type GeekKind = "hacker" | "engineer" | "scientist";
export type ZombieKind = "walker" | "sprinter";
export type MatchStatus = "playing" | "won" | "lost";

export interface Geek {
  id: number;
  kind: GeekKind;
  row: number;
  col: number;
  hp: number;
  cooldown: number;
}
export interface Zombie {
  id: number;
  kind: ZombieKind;
  row: number;
  x: number;
  hp: number;
  cooldown: number;
}
export interface Projectile {
  id: number;
  row: number;
  x: number;
  damage: number;
}
export interface PlaceCommand {
  type: "place";
  tick: number;
  playerId: number;
  sequence: number;
  row: number;
  col: number;
  kind: GeekKind;
}
export interface MoveCommand {
  type: "move";
  tick: number;
  playerId: number;
  sequence: number;
  entityId: number;
  row: number;
  col: number;
}
export type GameCommand = PlaceCommand | MoveCommand;
export interface GameEvent {
  type: "placed" | "moved" | "rejected" | "hit" | "destroyed" | "spawned" | "status";
  tick: number;
  entityId?: number;
  reason?: string;
}

export interface GameState {
  version: 1;
  configVersion: 1;
  seed: number;
  randomState: number;
  tick: number;
  nextId: number;
  energy: number;
  score: number;
  status: MatchStatus;
  waveIndex: number;
  geeks: Geek[];
  zombies: Zombie[];
  projectiles: Projectile[];
  events: GameEvent[];
}

export type GameSnapshot = GameState;
