# Distributed Concepts

Short interactive course for distributed systems. Learners build one global
service through four experiments. Each screen shows one system change and one
clear next action.

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
npm test
npm run lint
npm run build
```

Run lint and a production build before pushing. Commits pushed to `main`
deploy to the production Vercel project at `distributedconcepts.com`.

## Application architecture

`src/app/page.tsx` owns the quiet home, course view, responsive layout, and
globe composition. `src/lib/curriculum-runtime.ts` owns stable lesson identity,
order, readable lesson URLs, direct-entry preparation, and completion rules.
The globe stays mounted while the homepage, lesson panels, and visualizations
change. Route files under `src/app/lessons` supply indexable metadata and
static paths for the shared client experience.

Lesson navigation writes `/lessons/<slug>` with the History API. Browser Back,
browser Forward, Escape, and the course button must restore the matching
view without reloading the globe.

Each simulation uses four pieces:

1. A pure lesson simulation module owns valid actions, elapsed-time
   transitions, results, events, and replay.
2. A Zustand store adapts the simulation to React and runs sound effects.
3. A globe visualization reports frame time and renders the current state.
4. A panel explains the active phase and lets the learner trigger the next
   causal action.

Do not put the full simulation on one timer chain. A visual phase may animate
to its checkpoint, but the next meaningful system action should wait for the
learner. Keep phase transitions in the store when they represent a user action.

`CoursePanel`, `Stage`, `PathStrip`, and `ResultCard` in
`src/components/panels/CoursePanel.tsx` are the shared lesson parts. Keep one
primary action visible at a time. Use a second action only for replay or a real
two-way choice.

## Curriculum

The lesson registry lives in `src/lib/steps.ts`.

| Experiment | Concept | Interaction |
| --- | --- | --- |
| Build two copies | One leader accepts writes and one replica serves nearby reads | Place the leader, then add the replica |
| Follow one write | The leader acknowledges before remote replication ends | Send, then start replication |
| Race the copy | A replica can return an old value during the replication gap | Write, then read now or wait |
| Break the leader | Reads continue while writes pause for an in-region election | Fail, confirm, elect, then resume |

Do not add chapters, planned lesson cards, or a full region catalog. New course
material must first work as one short experiment with a visible result on the
globe.

Current phase checkpoints:

- Write: `idle` → `to-primary` → `primary-ack` → `replicating` → `complete`
- Consistency: `idle` → `writing` → `write-ack` → `racing` → `result` → `complete`
- Recovery: `idle` → `failure` → `detecting` → `electing` → `elected` → `recovering` → `complete`

`primary-ack`, `write-ack`, completed `failure`, completed `detecting`, and
`elected` are deliberate teaching pauses.

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

The 32 AWS and GCP regions are defined in `src/lib/regions.ts`.
`src/lib/topology.ts` enforces provider locking because the simulation does not
model cross-provider replication. The build experiment suggests valid regions,
and globe selection rejects invalid replicas.

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

- Desktop uses one 390px left lesson panel and the globe.
- Mobile keeps the globe in the upper half and the lesson panel in the lower
  half.
- Keep interactive targets at least 40px tall and preserve visible keyboard
  focus.
- Use tabular numerals for changing latency and progress values.
- Explain motion at every teaching checkpoint. Motion must show cause, state,
  or feedback. Do not add a second evidence panel or a dense event timeline.
- Keep explanatory animations fully enabled. Do not add reduced-motion
  branches unless the product direction changes.
- Use transitions for interruptible controls and `useFrame` for simulated
  network travel.
- Avoid `transition: all`. Animate explicit properties.

## State and persistence

The topology rules and lesson simulations are pure modules behind separate
Zustand adapters. Moving the shared client resets any active simulation so
visuals cannot retain progress for the previous location.

The curriculum progress store persists lesson completion state. Bump its
storage key when a curriculum rewrite invalidates existing progress.

Persist completion by stable `StepId`, never by array position. Direct lesson
entry may prepare the minimum valid same-provider topology needed by a
simulation, but prerequisite setup is not prerequisite completion. Only an
action taken while that lesson is active can award its completion.

## Change discipline

- Keep changes scoped to the requested lesson or interaction.
- Preserve unrelated worktree changes.
- Update `src/lib/steps.ts`, the course homepage, README course list, and
  this guide when lesson names or order change.
- Update the panel, store, and visualization together when a phase changes.
- Do not describe an automatic transition as learner-controlled unless the
  next phase really waits for an action.
