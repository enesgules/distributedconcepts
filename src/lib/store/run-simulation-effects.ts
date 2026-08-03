import {
  playAckSound,
  playElectionPulseSound,
  playFailureAlarmSound,
  playPacketSendSound,
  playRecoveryChimeSound,
  playReplicaArriveSound,
  playReplicateSound,
  playResponseSound,
  playStaleSound,
} from "@/lib/sounds";
import type { SimulationEffect, SimulationSound } from "@/lib/simulation/effects";

const soundPlayers = {
  "packet-send": playPacketSendSound,
  ack: playAckSound,
  replicate: playReplicateSound,
  "replica-arrive": playReplicaArriveSound,
  response: playResponseSound,
  stale: playStaleSound,
  failure: playFailureAlarmSound,
  election: playElectionPulseSound,
  recovery: playRecoveryChimeSound,
} satisfies Record<SimulationSound, () => void>;

export function runSimulationEffects(effects: readonly SimulationEffect[]) {
  for (const effect of effects) {
    soundPlayers[effect.sound]();
  }
}
