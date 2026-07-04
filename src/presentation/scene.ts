import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import "@babylonjs/core/Culling/ray.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { GameState, Geek, GeekKind } from "../game/model";
import { GEEK, ZOMBIE } from "../game/config";

export interface GameScene {
  engine: Engine;
  scene: Scene;
  tiles: AbstractMesh[];
  reconcile(state: GameState): void;
  setInteraction(
    state: GameState,
    selected: GeekKind | null,
    hover: { row: number; col: number } | null,
    hoveredEntityId: number | null,
    movingId: number | null,
  ): void;
  render(): void;
  dispose(): void;
}

function material(scene: Scene, name: string, color: Color3): StandardMaterial {
  const value = new StandardMaterial(name, scene);
  value.diffuseColor = color;
  value.specularColor = Color3.Black();
  return value;
}

export function createScene(canvas: HTMLCanvasElement): GameScene {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor.set(0.035, 0.055, 0.09, 1);
  const camera = new ArcRotateCamera("camera", -Math.PI / 2, 0.72, 14, new Vector3(0, 0, 0), scene);
  camera.lowerRadiusLimit = 11;
  camera.upperRadiusLimit = 16;
  camera.attachControl(canvas, true);
  new HemisphericLight("sky", new Vector3(0, 1, 0), scene).intensity = 0.85;
  new DirectionalLight("key", new Vector3(-1, -2, 1), scene).intensity = 0.65;
  const tileA = material(scene, "tile-a", Color3.FromHexString("#263a48"));
  const tileB = material(scene, "tile-b", Color3.FromHexString("#304b58"));
  const geekMaterials = {
    hacker: material(scene, "hacker", Color3.FromHexString("#42d9d0")),
    engineer: material(scene, "engineer", Color3.FromHexString("#ffb347")),
    scientist: material(scene, "scientist", Color3.FromHexString("#b78cff")),
  };
  const zombieMaterial = material(scene, "zombie", Color3.FromHexString("#8dbf68"));
  const projectileMaterial = material(scene, "packet", Color3.FromHexString("#fff06a"));
  const healthBackMaterial = material(scene, "health-back", Color3.FromHexString("#301b24"));
  const healthMaterial = material(scene, "health", Color3.FromHexString("#62df79"));
  const previewMaterial = material(scene, "placement-preview", geekMaterials.hacker.diffuseColor.clone());
  previewMaterial.alpha = 0.48;
  const preview = MeshBuilder.CreateBox("placement-preview", { size: 0.64 }, scene);
  preview.material = previewMaterial;
  preview.isPickable = false;
  preview.setEnabled(false);
  const tiles: AbstractMesh[] = [];
  for (let row = 0; row < 5; row += 1)
    for (let col = 0; col < 9; col += 1) {
      const tile = MeshBuilder.CreateBox(`tile-${row}-${col}`, { width: 0.96, depth: 0.96, height: 0.08 }, scene);
      tile.position.set(col - 4, 0, row - 2);
      tile.material = (row + col) % 2 ? tileA : tileB;
      tile.metadata = { row, col };
      tiles.push(tile);
    }
  interface EntityView {
    mesh: AbstractMesh;
    health?: AbstractMesh;
    healthBack?: AbstractMesh;
    maxHp?: number;
    lastHp?: number;
    healthUntilTick?: number;
  }
  const views = new Map<number, EntityView>();
  const reconcile = (state: GameState): void => {
    const live = new Set<number>();
    const ensure = (
      entity: Geek | GameState["zombies"][number] | GameState["projectiles"][number],
      kind: "geek" | "zombie" | "projectile",
    ): EntityView => {
      live.add(entity.id);
      const existing = views.get(entity.id);
      if (existing) return existing;
      const mesh =
        kind === "projectile"
          ? MeshBuilder.CreateSphere(`projectile-${entity.id}`, { diameter: 0.14 }, scene)
          : kind === "zombie"
            ? MeshBuilder.CreateCapsule(`zombie-${entity.id}`, { height: 0.8, radius: 0.22 }, scene)
            : MeshBuilder.CreateBox(`geek-${entity.id}`, { size: 0.58 }, scene);
      mesh.material =
        kind === "projectile"
          ? projectileMaterial
          : kind === "zombie"
            ? zombieMaterial
            : geekMaterials[(entity as Geek).kind];
      mesh.metadata =
        kind === "geek" ? { entityId: entity.id, entityType: "geek" } : { entityId: entity.id, entityType: kind };
      const view: EntityView = { mesh };
      if (kind !== "projectile") {
        const back = MeshBuilder.CreateBox(
          `health-back-${entity.id}`,
          { width: 0.68, height: 0.065, depth: 0.05 },
          scene,
        );
        back.parent = mesh;
        back.position.set(0, 0.68, 0);
        back.material = healthBackMaterial;
        back.isPickable = false;
        const health = MeshBuilder.CreateBox(
          `health-${entity.id}`,
          { width: 0.62, height: 0.035, depth: 0.055 },
          scene,
        );
        health.parent = mesh;
        health.position.set(0, 0.68, -0.005);
        health.material = healthMaterial;
        health.isPickable = false;
        back.setEnabled(false);
        health.setEnabled(false);
        view.health = health;
        view.healthBack = back;
        view.maxHp =
          kind === "zombie" ? ZOMBIE[(entity as GameState["zombies"][number]).kind].hp : GEEK[(entity as Geek).kind].hp;
        view.lastHp = (entity as Geek | GameState["zombies"][number]).hp;
        view.healthUntilTick = -1;
      }
      views.set(entity.id, view);
      return view;
    };
    const updateHealth = (view: EntityView, hp: number): void => {
      if (!view.health || !view.healthBack || !view.maxHp) return;
      if (view.lastHp !== undefined && hp < view.lastHp) view.healthUntilTick = state.tick + 60;
      view.lastHp = hp;
      const ratio = Math.max(0, Math.min(1, hp / view.maxHp));
      view.health.scaling.x = ratio;
      view.health.position.x = -0.31 * (1 - ratio);
      const recentlyDamaged = state.tick <= (view.healthUntilTick ?? -1);
      view.health.setEnabled(recentlyDamaged);
      view.healthBack.setEnabled(recentlyDamaged);
    };
    state.geeks.forEach((entity) => {
      const view = ensure(entity, "geek");
      view.mesh.position.set(entity.col - 4, 0.38, entity.row - 2);
      updateHealth(view, entity.hp);
    });
    state.zombies.forEach((entity) => {
      const view = ensure(entity, "zombie");
      view.mesh.position.set(entity.x / 1000 - 4, 0.43, entity.row - 2);
      updateHealth(view, entity.hp);
    });
    state.projectiles.forEach((entity) =>
      ensure(entity, "projectile").mesh.position.set(entity.x / 1000 - 4, 0.48, entity.row - 2),
    );
    for (const [id, view] of views)
      if (!live.has(id)) {
        view.mesh.dispose();
        views.delete(id);
      }
  };
  const setInteraction = (
    state: GameState,
    selected: GeekKind | null,
    hover: { row: number; col: number } | null,
    hoveredEntityId: number | null,
    movingId: number | null,
  ): void => {
    const cellEntityId = hover
      ? state.geeks.find((geek) => geek.row === hover.row && geek.col === hover.col)?.id
      : undefined;
    for (const [id, view] of views) {
      view.mesh.scaling.setAll(id === movingId ? 1.28 : 1);
      if (view.health && view.healthBack) {
        const showHealth =
          state.tick <= (view.healthUntilTick ?? -1) ||
          id === movingId ||
          id === hoveredEntityId ||
          id === cellEntityId;
        view.health.setEnabled(showHealth);
        view.healthBack.setEnabled(showHealth);
      }
    }
    if (!hover || (selected === null && movingId === null)) {
      preview.setEnabled(false);
      return;
    }
    const occupied = state.geeks.some(
      (geek) => geek.id !== movingId && geek.row === hover.row && geek.col === hover.col,
    );
    const moving = movingId === null ? undefined : state.geeks.find((geek) => geek.id === movingId);
    const previewKind = moving?.kind ?? selected;
    if (!previewKind) {
      preview.setEnabled(false);
      return;
    }
    previewMaterial.diffuseColor = occupied ? Color3.FromHexString("#ff5d6c") : geekMaterials[previewKind].diffuseColor;
    preview.position.set(hover.col - 4, 0.39, hover.row - 2);
    preview.setEnabled(true);
  };
  return {
    engine,
    scene,
    tiles,
    reconcile,
    setInteraction,
    render: () => scene.render(),
    dispose: () => {
      for (const view of views.values()) view.mesh.dispose();
      scene.dispose();
      engine.dispose();
    },
  };
}
