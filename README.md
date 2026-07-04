# Geeks Against Zombies

Geeks Against Zombies is a deterministic, one-screen lane-defense game about protecting a network from incoming threats.

It is built with TypeScript, Vite, Babylon.js, Babylon Flow Graph, and plain HTML/CSS. The project deliberately avoids UI frameworks and keeps gameplay independent from rendering frame rate.

## Gameplay

Defend five network lanes by placing specialist geeks on the board:

- **Hacker** — launches ranged packet attacks.
- **Engineer** — durable blocker that holds a lane.
- **Scientist** — periodically generates energy.

Stop Walkers and Sprinters before they cross the network boundary. Placement costs energy; moving an existing geek is free.

## Controls

- Mouse or touch is the primary way to play.
- Select a geek from the deck, then click or tap an empty tile to place it.
- Click a placed geek or its tile, then select another tile to move it.
- Optionally, press <kbd>1</kbd>–<kbd>3</kbd> to select a geek type.
- Press <kbd>Space</kbd> to pause or resume.
- Use the `2x` button to toggle double simulation speed.
- Press <kbd>R</kbd> to restart.

## Development

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

## Scripts

```bash
npm run dev          # Start the Vite development server
npm run build        # Typecheck and create a production build
npm run preview      # Preview the production build
npm run format       # Format the repository with Prettier
npm run format:check # Verify formatting
npm run lint         # Run ESLint with zero warnings allowed
npm run typecheck    # Run strict TypeScript checks
npm test             # Run deterministic headless tests
npm run check        # Run every release gate
```

## Architecture

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

The simulation runs at 20 fixed ticks per second. Gameplay state, commands, waves, damage, movement, and outcomes live under `src/game` and do not depend on Babylon.js, browser APIs, or wall-clock timers.

Babylon presentation reconciles meshes from simulation state. Flow Graph adapts scene ticks and pointer input. Rendering, shaders, animations, and effects never decide gameplay outcomes.

Further documentation:

- [Architecture report](./ARCHITECTURE.md)
- [Coding agent guide](./CODING_AGENT_GUIDE.md)
- [Implementation plan](./AGENT_PLAN_VITE.md)

## Determinism

The same application version, configuration, seed, and command log should produce the same state hash.

The test suite covers replay hashing, serialization continuity, command rejection, movement, pause behavior, speed control, and varying render schedules.

## License

Licensed under the [Apache License 2.0](./LICENSE).
