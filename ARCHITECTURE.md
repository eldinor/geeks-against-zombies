# Geeks Against Zombies — Architecture Report

## Overview

Geeks Against Zombies is a one-screen deterministic lane-defense game built with TypeScript, Vite, Babylon.js, Babylon Flow Graph, HTML, and CSS.

The application deliberately separates gameplay decisions from rendering and browser input:

```text
HTML controls / Babylon pointer input
                 ↓
         Flow Graph adapters
                 ↓ commands
      Deterministic simulation
                 ↓ state + events
       Babylon presentation
                 ↓
        Canvas and HTML HUD
```

No React, Next.js, component framework, UI framework, physics engine, or remote asset runtime is used.

## Architectural goals

- Produce identical state for the same seed and command log.
- Keep simulation code runnable in Node without DOM or Babylon initialization.
- Prevent rendering frame rate from affecting gameplay outcomes.
- Keep the complete interface inside one browser viewport.
- Make application startup, restart, and disposal explicit.
- Keep browser and Flow Graph blocks as narrow adapters rather than gameplay authorities.

## Module structure

```text
index.html
src/
  main.ts
  styles.css
  app/
    game-app.ts
    dom-view.ts
  game/
    config.ts
    hash.ts
    model.ts
    random.ts
    replay.ts
    runtime.ts
    simulation.ts
  flow/
    advance-simulation-block.ts
    create-game-graph.ts
    queue-command-block.ts
  presentation/
    scene.ts
  tests/
    flow-wiring.test.ts
    runtime.test.ts
    simulation.test.ts
```

Dependency direction is intentionally one-way:

```text
game ← app ← flow / presentation / DOM
```

The `game` directory does not import Babylon.js, DOM APIs, application controllers, or presentation modules.

## Deterministic simulation

### State

`GameState` contains all authoritative match data:

- State and configuration format versions.
- Initial seed and serializable PRNG state.
- Integer simulation tick and monotonically increasing entity ID.
- Energy, score, match status, and wave progress.
- Geek, zombie, and projectile records.
- Semantic events produced by the most recent tick.

Gameplay positions and timing use integers. A board cell is represented as 1,000 position units, and authoritative time advances at 20 ticks per second.

### Commands

The simulation currently accepts two command types:

- `place`: create a selected geek on an empty cell and deduct its energy cost.
- `move`: move an existing geek to an empty destination without changing energy.

Commands contain a target tick, player ID, and sequence number. Before application they are ordered by:

```text
(tick, playerId, sequence)
```

Validation is atomic. Invalid commands do not partially modify entities or resources; they emit a `rejected` event containing a user-readable reason.

### Tick order

Each call to `step()` performs systems in a stable order:

1. Increment the integer tick.
2. Sort, validate, and apply commands for that tick.
3. Spawn scheduled wave entities.
4. Generate scientist energy.
5. Acquire hacker targets and create projectiles.
6. Move projectiles.
7. Resolve projectile hits.
8. Move zombies or resolve their attacks.
9. Remove destroyed entities and award score.
10. Evaluate victory and defeat.
11. Leave semantic events on the resulting state.

Entity arrays are processed and retained in stable ID order.

### Runtime and rendering schedules

`FixedStepRuntime` converts variable frame deltas into fixed simulation ticks:

- Fixed step: 1/20 second.
- A single frame delta is clamped to 0.25 seconds.
- At most five catch-up ticks execute per rendered frame.
- Remaining accumulated time is retained for later frames and interpolation.

The runtime owns queued commands. Babylon renders the latest state but cannot decide damage, movement, occupancy, affordability, spawning, victory, or defeat.

### Serialization, replay, and hashing

State is JSON-serializable and can be restored without losing authoritative values. Replay data contains its version, seed, configuration version, and command list.

`stateHash()` creates a stable FNV-1a hash of authoritative state while excluding transient semantic events. This supports deterministic replay comparison and bug reproduction.

## Application controller

`GameApp` is the explicit composition and lifecycle root. It owns:

- `FixedStepRuntime` and current `GameState`.
- Selected geek kind.
- Geek currently selected for movement.
- Hovered board cell and rejection feedback lifetime.
- Player command sequence number.
- Babylon scene and Flow Graph coordinator handles.
- Pause and restart behavior.
- DOM listeners, resize observer, and disposal callbacks.

The controller translates user intent into commands. For example, clicking an empty tile queues placement, while clicking an occupied tile selects its geek for movement. Clicking a destination then queues a deterministic `move` command.

The controller does not mutate entity state directly.

## Flow Graph integration

### Simulation tick block

`AdvanceSimulationBlock` extends Babylon's `FlowGraphSceneTickEventBlock`. Its event payload supplies frame delta time to `FixedStepRuntime`. When one or more fixed ticks run, the block asks the application controller to publish the resulting state.

Gameplay rules remain in `simulation.ts`; the block only advances the runtime and publishes results.

### Pointer command block

Babylon 9 provides dedicated Flow Graph pointer events. `QueueCommandBlock` extends `FlowGraphPointerDownEventBlock`, while `PublishHoverBlock` extends `FlowGraphPointerMoveEventBlock`:

- Pointer down resolves mesh metadata and sends an interaction target to `GameApp`.
- Pointer move resolves mesh metadata and updates the hover preview.

The coordinator owns event registration and cleanup; the application does not install parallel scene observers.

Babylon's tree-shaken Ray module is explicitly imported because `scene.pick()` requires its registration side effect.

The pointer block never validates occupancy, calculates cost, or mutates game state.

## Babylon presentation

`createScene()` creates and owns:

- Babylon engine and scene.
- Arc-rotate camera with constrained zoom.
- Hemispheric and directional lighting.
- A 5×9 grid of pickable tile meshes.
- Generated materials for tiles, geek roles, zombies, and projectiles.
- Entity ID to mesh reconciliation map.
- Placement/movement preview mesh.

### Reconciliation

Simulation entities are mapped to Babylon meshes by stable entity ID:

- Missing views are created.
- Existing views receive positions from authoritative state.
- Views whose entities no longer exist are disposed.

Mesh metadata is interaction and debugging information only. It is never authoritative gameplay state.

### Interaction presentation

- Hovering a tile displays a translucent preview of the selected geek.
- An occupied destination changes the preview to red.
- Selecting a geek for movement enlarges its mesh.
- Preview meshes are non-pickable and cannot interfere with board input.

These effects communicate state but do not decide whether a command succeeds.

## DOM and CSS presentation

The HTML HUD owns semantic controls and text:

- Energy, score, and wave counters.
- Geek deck buttons.
- Pause and help controls.
- Victory/defeat message.
- Accessible rejection feedback live region.

`DomView` only renders values supplied by `GameApp`. Text is assigned with `textContent`, button state uses native disabled and ARIA attributes, and required elements are queried once with clear failures for missing markup.

The page shell uses three CSS Grid rows:

```text
header
minmax(0, 1fr) canvas region
geek deck
```

The document root uses fixed width and height with hidden overflow. The canvas is sized from its container with `ResizeObserver`, while the deck may scroll horizontally on narrow screens.

## Lifecycle and resource ownership

Startup proceeds in this order:

1. Construct `GameApp` and required DOM references.
2. Create deterministic state and fixed-step runtime.
3. Create Babylon engine, scene, board, and presentation resources.
4. Create and start Flow Graphs.
5. Start the Babylon render loop.
6. Register DOM listeners and resize observation.
7. Publish the initial state.

Disposal removes DOM listeners, disconnects resize observation, disposes Flow Graphs, disposes scene meshes and materials through the scene, and finally disposes the Babylon engine.

Vite hot-module disposal invokes the same application disposal path.

## Testing and build gates

The current automated suite covers:

- Repeated deterministic replay hashing.
- Serialize/restore continuation.
- Atomic invalid placement rejection.
- Successful movement without energy cost.
- Atomic occupied-destination movement rejection.
- Equivalent state under different render-frame schedules.
- Expected Flow Graph adapter construction.

The project exposes separate lint, strict typecheck, test, and production build commands. The production build currently succeeds without suppressed TypeScript or ESLint errors.

## Current limitations and risks

- Babylon Flow Graph is experimental; its APIs should be checked when upgrading Babylon.
- Replay import/export has headless support but no user-facing file UI yet.
- Presentation uses generated primitives; character assets and animation systems are not implemented.
- Entity movement is applied immediately in presentation rather than visually interpolated.
- Health bars, sound, volume preferences, debug UI, and replay tools remain future work.
- The production Babylon bundle is large and needs profiling and further subpath/code-splitting work.
- Automated browser coverage should be expanded to all required viewport sizes and repeated restart/disposal scenarios.

## Extension rules

Future work should preserve these constraints:

- Add gameplay rules only inside `src/game`.
- Represent player actions as versioned deterministic commands.
- Keep Flow Graph blocks narrow and lifecycle-safe.
- Treat Babylon physics, animations, callbacks, and meshes as presentation only.
- Do not use wall-clock timers or rendering completion for game rules.
- Serialize every value required to continue a match.
- Add deterministic tests before expanding waves, entities, or progression.
