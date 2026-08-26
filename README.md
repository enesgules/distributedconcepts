# Distributed Concepts

Distributed Concepts is a short, interactive course about distributed systems.
The learner builds one global service on a live 3D globe. Each screen explains
one system change and gives the learner one clear next action.

The course has four experiments:

1. **Build two copies** — Place a leader and one distant read replica.
2. **Follow one write** — See the leader reply before replication ends.
3. **Race the copy** — Read now or wait, then observe eventual consistency.
4. **Break the leader** — Detect failure, elect a standby, and resume writes.

The globe stays mounted during the full course. Browser Back, browser Forward,
Escape, and the course button change the view without a page reload. Each
lesson also has a direct URL, such as `/lessons/stale-read`.

## Technology

- Next.js 16, React 19, and TypeScript
- React Three Fiber, Drei, and custom GLSL shaders
- Tailwind CSS v4
- Zustand v5
- Framer Motion and R3F `useFrame`

The simulation runs in the browser. It does not use a database or application
API.

## Start the app

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Use these commands before a production change:

```bash
npm test
npm run lint
npm run build
```

## Main files

- `src/app/page.tsx` composes the home, globe, and four lesson views.
- `src/components/panels/CoursePanel.tsx` provides the common lesson shell.
- `src/components/panels/*LessonPanel.tsx` provides the guided lesson actions.
- `src/components/globe/*Visualization.tsx` shows each system action.
- `src/lib/steps.ts` defines the course order and copy.
- `src/lib/curriculum-runtime.ts` defines routes and completion rules.
- `src/lib/simulation` contains the pure simulation state machines.
- `src/lib/store` adapts the simulations to React and saves course progress.
