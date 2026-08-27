# Domain glossary

## Course

The ordered set of four interactive experiments. Each experiment has one
stable `StepId`, one slug, and one position in the course.

## Course runtime

The module that resolves course identity, route location, order, direct
entry preparation, and lesson completion. Rendering stays in the page and
lesson-specific modules.

## Topology

The simulated database layout: one leader region and zero or more read replica
regions. Every region in a topology belongs to the same provider.

## Lesson simulation

The causal state machine for one interactive lesson. It owns valid learner
actions, elapsed-time transitions, results, events, and replay. Panels and
globe visualizations adapt learner input and animation frames to it.

## Teaching checkpoint

A deliberate pause after a meaningful system action. The learner must
understand the current state before triggering the next action.

## Latency model

The module that compares network paths and samples variation for a simulated
run. Course comparisons use one deterministic world sample. Interactive runs
may sample jitter explicitly.
