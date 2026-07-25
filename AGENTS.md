# Distributed Concepts

Interactive 3D curriculum for distributed database concepts. Learners build a
small global topology, then advance each write, read, consistency, and recovery
simulation one system action at a time.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS v4 with the inline theme in `src/app/globals.css`
- React Three Fiber, Drei, and custom GLSL shaders for the globe
- Framer Motion for interface transitions and R3F `useFrame` for 3D motion
- Zustand v5 stores in `src/lib/store`
- Client-side simulation only. There is no database or application API.

## Commands

```bash
npm run dev
npm run lint
npm run build
```

Run lint and a production build before pushing. Commits pushed to `main`
deploy to the production Vercel project at `distributedconcepts.com`.

## Application architecture

`src/app/page.tsx` owns the six-lesson route, responsive layout, globe
composition, and lesson completion. The globe stays mounted while lesson
panels and visualizations change.

Each simulation uses three pieces:

1. A Zustand store owns the typed phase, progress values, and lesson actions.
2. A globe visualization advances animation only for the current phase.
3. A panel explains the active phase and lets the learner trigger the next
   causal action.

Do not put the full simulation on one timer chain. A visual phase may animate
to its checkpoint, but the next meaningful system action should wait for the
learner. Keep phase transitions in the store when they represent a user action.

`LessonSequence` in `src/components/panels/FlowPanel.tsx` is the shared action
rail. Use it for the current action, its explanation, and completed actions.

## Curriculum

The lesson registry lives in `src/lib/steps.ts`.

| Lesson | Concept | Interaction |
| --- | --- | --- |
| Place the Leader | One region commits every write | Choose the write region |
| Add a Read Replica | Nearby copies reduce read latency | Add a replica and compare coverage |
| Commit a Write | Acknowledgment precedes remote replication | Send → commit → replicate |
| Route a Read | Reads use the nearest available copy | Route → fetch → return |
| Expose a Stale Read | A read can beat replication | Commit → open window → race → inspect |
| Recover the Leader | Writes pause while a replacement is chosen | Fail → detect → elect → resume |

Current phase checkpoints:

- Write: `idle` → `to-primary` → `primary-ack` → `replicating` → `complete`
- Read: `idle` → `fetching` → `arriving` → `responding` → `complete`
- Consistency: `idle` → `writing` → `write-ack` → `racing` → `result` → `complete`
- Recovery: `idle` → `failure` → `detecting` → `electing` → `elected` → `recovering` → `complete`

`primary-ack`, `arriving`, `write-ack`, completed `failure`, completed
`detecting`, and `elected` are deliberate teaching pauses.

## Distributed database model

- One primary region, described to learners as the leader, accepts writes.
- Read replicas serve read traffic and receive writes asynchronously.
- Reads route to the nearest active region.
- Replication delay depends on geographic distance.
- A read replica can return an older value until replication arrives.
- High availability uses backup nodes inside the leader region.
- A leader failure briefly blocks writes. Read replicas continue serving reads.
- Election promotes an in-region backup, so failover does not move the
  geographic write region.

The 36 AWS and GCP regions are defined in `src/lib/regions.ts`. Keep provider
locking in the region builder because the simulation does not model
cross-provider replication.

## Globe conventions

- `GlobeScene` accepts `children` for arcs, packets, and lesson visualizations.
- `GLOBE_RADIUS` is exported from `src/components/globe/Globe.tsx`.
- Convert latitude and longitude with `latLonToVector3` from
  `src/lib/geo-utils.ts`.
- Build paths with helpers in `src/lib/arc-utils.ts`.
- Reuse `DataPacket`, `PrimaryFlash`, and `ReplicationWave` instead of
  recreating lesson effects.
- Keep per-frame work allocation-free where practical.

## Interface and motion

- Desktop uses a 380px left lesson panel, globe, optional right evidence panel,
  and bottom curriculum navigation.
- Mobile keeps the globe in the upper half and the lesson panel in the lower
  half.
- Keep interactive targets at least 40px tall and preserve visible keyboard
  focus.
- Use tabular numerals for changing latency and progress values.
- Explain motion at every teaching checkpoint. Motion must show cause, state,
  or feedback.
- Keep explanatory animations fully enabled. Do not add reduced-motion
  branches unless the product direction changes.
- Use transitions for interruptible controls and `useFrame` for simulated
  network travel.
- Avoid `transition: all`. Animate explicit properties.

## State and persistence

The database topology and simulation phases live in separate Zustand stores.
Moving the shared client resets any active simulation so visuals cannot retain
progress for the previous location.

The onboarding store persists only welcome and lesson completion state. Bump
its storage key when a curriculum rewrite should be shown to returning users.

## Change discipline

- Keep changes scoped to the requested lesson or interaction.
- Preserve unrelated worktree changes.
- Update `src/lib/steps.ts`, the welcome lesson list, README curriculum, and
  this guide when lesson names or order change.
- Update the panel, store, and visualization together when a phase changes.
- Do not describe an automatic transition as learner-controlled unless the
  next phase really waits for an action.
