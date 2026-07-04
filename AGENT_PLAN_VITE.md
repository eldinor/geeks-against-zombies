# Geeks Against Zombies — Vite Rebuild Agent Plan

## Mission

Build **Geeks Against Zombies** as a deterministic, one-screen lane-defense game using only:

- TypeScript
- Vite
- Babylon.js
- Babylon Flow Graph
- Plain HTML and CSS

Do not use React, Next.js, Vue, Svelte, Angular, JSX, component frameworks, CSS frameworks, or UI libraries.

The entire application must fit inside one browser viewport without document scrolling at supported desktop and mobile sizes.

## Lessons carried forward

The previous prototype established several rules that this implementation must retain:

- The simulation must not depend on Babylon.js, the DOM, rendering FPS, or wall-clock timers.
- Babylon Flow Graph can drive the fixed-step accumulator through `FlowGraphSceneTickEventBlock`.
- Babylon Flow Graph can translate tile interaction through `FlowGraphMeshPickEventBlock`.
- One render frame is not one simulation tick.
- Rendering consumes snapshots and semantic events; it never decides gameplay outcomes.
- Commands, seeded randomness, serialization, and stable processing order are required from the beginning.
- Framework state management is unnecessary for this game. A small explicit application controller is easier to reason about.
- Use Babylon.js package subpath imports where practical to control bundle size.
- Validate the production bundle early, not only the development server.

## Product scope

The first release is a compact 3–5 minute defense level containing:

- Five lanes and nine columns.
- Three geek types.
- Two zombie types.
- One energy economy.
- Deterministic waves.
- Victory, defeat, pause, restart, and help states.
- Mouse, touch, and keyboard interaction.
- A debug mode with tick, seed, state hash, and entity counts.

Everything is presented on one screen. Do not add routes or separate pages.

## Architecture

```text
HTML controls / Babylon mesh picks
                 ↓
          Flow Graph input
                 ↓ commands
      Deterministic simulation
                 ↓ snapshots + events
        Babylon presentation
                 ↓
     Canvas + small HTML HUD
```

### Ownership boundaries

#### Simulation owns

- Tick number and match status.
- Entity IDs and entity state.
- Board occupancy.
- Health, damage, movement, cooldowns, and targeting.
- Energy, costs, score, waves, victory, and defeat.
- Seeded random state.
- Command validation.
- Replay and save state.

#### Flow Graph owns

- Scene Tick orchestration.
- Mesh-pick and pointer interaction routing.
- Presentation event routing.
- Animation, particles, audio, highlighting, and tutorial sequences.
- Calling narrow bridge blocks that queue commands or advance simulation.

#### Babylon.js owns

- Engine, scene, camera, lights, meshes, materials, animations, audio, and picking.
- Visual interpolation between simulation snapshots.
- Temporary effects associated with semantic simulation events.

#### HTML/CSS owns

- Header, resource counters, unit deck, pause/help controls, and modal overlays.
- Responsive one-screen layout.
- Accessibility labels and keyboard focus.

The HTML HUD must not duplicate authoritative gameplay state. It renders values supplied by the application controller.

## Proposed file structure

```text
index.html
package.json
tsconfig.json
vite.config.ts
src/
  main.ts
  styles.css
  app/
    game-app.ts
    dom-view.ts
    lifecycle.ts
  game/
    model.ts
    config.ts
    random.ts
    commands.ts
    simulation.ts
    runtime.ts
    events.ts
    hash.ts
    replay.ts
  presentation/
    scene.ts
    entity-view.ts
    reconcile.ts
    effects.ts
    materials.ts
  flow/
    create-game-graph.ts
    advance-simulation-block.ts
    queue-command-block.ts
    publish-events-block.ts
  tests/
    simulation.test.ts
    runtime.test.ts
    replay.test.ts
```

Keep modules small and dependency direction one-way:

```text
game ← app ← presentation / flow
```

The `game` directory must never import from `app`, `presentation`, `flow`, Babylon.js, or browser APIs.

## Deterministic contract

- Run simulation at 20 fixed ticks per second.
- Store authoritative time as an integer tick.
- Use integer or fixed-point values for gameplay positions and rates.
- Use a seeded PRNG stored inside `GameState`; never use `Math.random()` for gameplay.
- Assign monotonically increasing integer entity IDs.
- Process systems in a documented order.
- Process entities by stable ID order.
- Sort commands by `(tick, playerId, sequence)`.
- Commands either apply completely or reject without partial mutation.
- Do not use `Date.now`, `performance.now`, `setTimeout`, animation completion, physics callbacks, or audio completion for game rules.
- Serialize every value necessary to continue a match.
- The same version, configuration, seed, and command log must produce the same state hash.

## One-screen layout contract

Use a fixed viewport shell:

```css
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}
```

Recommended layout:

```text
┌─────────────────────────────────────────────┐
│ Title       Energy / Score       Controls  │
├─────────────────────────────────────────────┤
│                                             │
│            Babylon game canvas              │
│                                             │
├─────────────────────────────────────────────┤
│ Geek deck: Hacker | Engineer | Scientist   │
└─────────────────────────────────────────────┘
```

Requirements:

- Use CSS Grid with rows `auto minmax(0, 1fr) auto`.
- Give the canvas container `min-height: 0` and `overflow: hidden`.
- Size the Babylon canvas from its container using `ResizeObserver` and `engine.resize()`.
- Use compact responsive controls rather than allowing wrapping to create document scroll.
- On narrow screens, abbreviate secondary text and allow the deck itself to scroll horizontally if necessary; the document must remain fixed.
- Respect safe-area insets on mobile.
- Test at 360×640, 768×1024, 1366×768, and 1920×1080.
- Game overlays must stay inside the canvas region or replace its content visually; they must not expand layout height.

## Stage 0 — Replace the application shell

### Work

- Remove Next.js, React, React DOM, Next configuration, framework-generated files, and framework lint rules.
- Create a standard Vite TypeScript application.
- Keep Babylon.js and the existing framework-independent simulation only if they satisfy this plan.
- Use one `index.html` containing the semantic application skeleton.
- Use one stylesheet entry point.
- Add scripts for `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, and `check`.
- Configure Vitest for headless simulation tests.
- Enable strict TypeScript without ignored errors.

### Dependencies

Production dependencies should normally contain only `@babylonjs/core`.

Development dependencies should normally contain only Vite, TypeScript, Vitest, ESLint, and narrowly required TypeScript ESLint packages.

Do not add Babylon loaders until local glTF assets are introduced.

### Gate

- Vite development server opens the one-screen shell.
- Production build succeeds.
- No React or Next packages remain in the dependency graph.
- `rg "react|next/|next\." src index.html package.json` finds no application dependency usage.

## Stage 1 — Preserve and strengthen the headless simulation

### Work

- Retain or implement `createGame(seed)` and `step(state, commands)`.
- Keep the 20 Hz fixed simulation rate.
- Implement stable command ordering and rejection events.
- Keep seeded PRNG state serializable.
- Implement three geek roles:
  - Hacker: ranged packet attack.
  - Engineer: durable blocker.
  - Scientist: periodic energy generation.
- Implement two zombie roles:
  - Walker: baseline enemy.
  - Sprinter: lower health and greater speed.
- Implement deterministic wave configuration.
- Implement win and loss states.
- Add state format and replay format versions.

### System order

Document and test a stable order such as:

1. Increment tick.
2. Validate and apply commands.
3. Spawn scheduled wave entities.
4. Generate resources.
5. Acquire targets and fire.
6. Move projectiles.
7. Resolve projectile collisions.
8. Resolve zombie movement and attacks.
9. Remove destroyed entities.
10. Evaluate victory and defeat.
11. Emit final snapshot and events.

### Tests

- Run the same 10,000-tick replay twice and compare hashes.
- Compare uninterrupted execution with serialize/restore execution.
- Compare different render-frame schedules reaching the same simulation tick.
- Verify invalid commands leave state unchanged except for rejection events.
- Verify entity insertion/removal cannot reorder surviving entities unexpectedly.
- Verify PRNG continuation after serialization.
- Verify wave schedules do not use render time.

### Gate

All simulation tests run in Node without Vite browser APIs or Babylon.js initialization.

## Stage 2 — Plain TypeScript application controller

### Work

Implement a `GameApp` class or equivalent explicit controller that owns:

- The current `FixedStepRuntime`.
- Selected geek type.
- Command sequence number.
- Scene and Flow Graph lifecycle handles.
- DOM view references.
- Pause/restart state.
- Disposal.

Suggested interface:

```ts
interface GameApp {
  start(): Promise<void>;
  selectGeek(kind: GeekKind): void;
  queuePlacement(row: number, col: number): void;
  pause(): void;
  resume(): void;
  restart(seed?: number): void;
  dispose(): void;
}
```

Do not introduce a generic state-management library. Use direct typed methods and small event subscriptions.

### DOM rules

- Query required elements once during initialization.
- Fail clearly if required markup is missing.
- Update text using `textContent`.
- Toggle visual states with classes and ARIA attributes.
- Store every event-listener cleanup callback and execute it during disposal.
- Use event delegation where it makes the deck simpler.

### Gate

Starting, pausing, restarting, and disposing the app repeatedly must not duplicate event listeners, render loops, Flow Graph coordinators, or canvases.

## Stage 3 — Babylon.js presentation

### Work

- Create engine, scene, camera, lighting, and a 5×9 board.
- Keep camera limits appropriate for a one-screen strategy game.
- Give every simulation entity a stable render mapping by entity ID.
- Reconcile additions, updates, and removals from snapshots.
- Interpolate presentation transforms without modifying simulation positions.
- Dispose meshes, materials, animations, particles, and observers when their view is removed.
- Use primitives and generated materials first.
- Load final assets locally later; do not depend on remote raw URLs.

### Presentation rules

- Entity meshes contain `entityId` metadata for debugging only.
- Babylon collisions and physics are not authoritative.
- Missing effects or assets cannot stop simulation progress.
- A destroyed entity may finish a visual death animation, but it is already absent from simulation state.
- Scene restart must dispose all previous resources.

### Gate

Render one recorded replay at artificial 30, 60, and 144 FPS schedules and confirm the final simulation hash remains identical.

## Stage 4 — Native Flow Graph integration

### Tick graph

Build a graph equivalent to:

```text
SceneTickEventBlock
  → AdvanceSimulationBlock(deltaTime)
  → PublishEventsBlock
  → ReconcilePresentationBlock
```

`AdvanceSimulationBlock` must:

- Clamp a single frame delta to avoid a tab-resume spiral.
- Accumulate seconds.
- Advance zero or more fixed simulation ticks.
- Limit catch-up ticks per rendered frame.
- Preserve remaining accumulator time for interpolation.
- Emit snapshots and events without embedding gameplay rules.

### Interaction graph

For board tiles:

```text
MeshPickEventBlock
  → QueuePlacementCommandBlock(row, col, selectedGeek)
```

Use pointer-over/out blocks for tile highlighting where useful. Highlighting must not change occupancy or command validity.

### Custom-block rules

- Custom blocks are narrow adapters around typed application methods.
- Custom blocks do not calculate damage, movement, cost, cooldowns, or waves.
- Register blocks when serialization requires it.
- Give blocks stable class names.
- Dispose the coordinator with the scene.
- Validate the graph during development and treat validation warnings as defects.

### Gate

Record commands from an interactive match, replay them headlessly, and obtain the same final state hash.

## Stage 5 — One-screen HUD and interaction

### Work

- Build the HUD in semantic HTML.
- Display energy, score, wave progress, pause, help, and sound controls.
- Build the geek deck with native buttons.
- Reflect selected, unaffordable, and cooldown states with CSS and ARIA.
- Add keyboard shortcuts for geek selection and pause.
- Add a visible focus treatment.
- Add touch targets of at least 44 CSS pixels.
- Add compact victory and defeat overlays.
- Add reduced-motion behavior.

### Accessibility

- Keep counters in an appropriately restrained live region.
- Give the canvas an accessible label.
- Provide keyboard placement mode or an accessible board-cell control layer.
- Do not communicate affordability or selection through color alone.
- Ensure overlays trap focus only while open and restore focus on close.

### Gate

- No document scrollbars at the required viewport sizes.
- All essential actions work with mouse, touch, and keyboard.
- Text remains readable at 200% browser zoom, with compact-mode adaptations where required.

## Stage 6 — Replay, debug, and balancing tools

### Work

- Export replay as `{ version, seed, configVersion, commands }`.
- Import and validate replay data.
- Add a development-only debug panel.
- Support pause, single simulation tick, and fast-forward.
- Display tick, seed, hash, queued commands, and entity counts.
- Add headless balance simulations that can run thousands of matches without Babylon.js.
- Make level, geek, zombie, and wave definitions data-driven and schema-validated.

### Gate

A developer can reproduce a reported match exactly from its replay file and state hash.

## Stage 7 — Production hardening

### Work

- Measure production bundle size and identify unexpectedly retained Babylon modules.
- Verify Vite source maps and production asset paths.
- Test WebGL context loss and restoration behavior.
- Test resize, orientation changes, visibility changes, and long tab suspension.
- Test repeated restart and disposal for leaks.
- Pool only effects proven expensive by profiling.
- Add local asset-loading error states.
- Add volume controls and persist preferences separately from gameplay state.
- Version save and replay formats.
- Remove debug logs and development-only globals from production.

### Release gate

- `npm run check` passes lint, typecheck, tests, and production build.
- A production preview passes a browser smoke test.
- No validation is suppressed.
- No application route or framework runtime exists.
- No remote production assets exist.
- A representative match stays within the agreed CPU/GPU budget.
- The one-screen layout has no document scrolling at supported sizes.
- A replay remains deterministic after a clean reload.

## Required scripts

The final `package.json` should expose:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "check": "npm run lint && npm run typecheck && npm test && npm run build"
  }
}
```

## Agent operating rules

- Complete stages in order and satisfy each gate before expanding scope.
- Preserve the deterministic simulation boundary even when a visual shortcut is tempting.
- Prefer browser and Babylon APIs over new dependencies.
- Do not add a framework to solve lifecycle or DOM updates.
- Do not weaken TypeScript, linting, tests, or production builds.
- Do not use private Babylon APIs when a public API exists.
- Do not use remote assets in production.
- Do not make visual animations authoritative.
- Preserve unrelated user changes.
- Measure bundle and performance results instead of estimating them.
- Document architectural deviations before implementing them.

## First implementation milestone

The first milestone is complete only when all of the following are true:

1. Vite serves a one-screen HTML/CSS shell with no React or Next.js.
2. A known seed creates a deterministic match.
3. Commands place a Hacker and Scientist on known ticks.
4. A deterministic zombie wave runs for 10,000 headless ticks.
5. Repeating the replay produces the identical final hash.
6. Babylon.js renders the replay without changing the hash.
7. Flow Graph Scene Tick drives the fixed-step accumulator.
8. Flow Graph mesh picking queues placement commands.
9. The production Vite build passes.
10. The page has no document scrolling at all required viewport sizes.

Only after this milestone should final character assets, elaborate effects, additional levels, or progression systems be introduced.
