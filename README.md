# Belt Balancer

A puzzle game that teaches Satisfactory players how to load-balance conveyor belts.

## Tech Stack

- **Vite** — build tool and dev server
- **React 18** + **TypeScript**
- **Tailwind CSS** — styling
- **Zustand** — state management
- **React Flow** — node-based canvas editor
- **Vitest** — unit testing

## Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Status

**Step 1 — Scaffold** (current)
Vite + React + TS + Tailwind + Zustand + React Flow. Grid canvas with one hardcoded input and output node.

## Build Order

| Step | Description | Status |
|------|-------------|--------|
| 1 | Scaffold: blank grid canvas with input/output nodes | ✅ |
| 2 | Solver: `solveFlow` pure function, fully unit-tested | 🔜 |
| 3 | Node types + palette, live rates on edges | 🔜 |
| 4 | Level loader, win detection, localStorage progress | 🔜 |
| 5 | First 5 levels + basic UI polish | 🔜 |
| 6 | Tutorial annotations + codex scaffold | 🔜 |
| 7 | Levels 6–15 | 🔜 |
| 8 | Hint ladder + solution reveal | 🔜 |
| 9 | Blueprints | 🔜 |
| 10 | Remaining levels + polish | 🔜 |

## License

MIT
