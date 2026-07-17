export const SOUND_STORAGE_KEY = "sound-enabled";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_STORAGE_KEY) !== "true";
}

/** Create a connected oscillator+gain pair scheduled from start to stop (seconds relative to now). */
function voice(
  c: AudioContext,
  type: OscillatorType,
  start: number,
  stop: number
): { osc: OscillatorNode; gain: GainNode; t: number } {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + stop);
  return { osc, gain, t: c.currentTime };
}

/** Deep bass thump — region selected */
export function playSelectSound() {
  if (isMuted()) return;
  const { osc, gain, t } = voice(getCtx(), "sine", 0, 0.18);
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
}

/** Low drop — region deselected */
export function playDeselectSound() {
  if (isMuted()) return;
  const { osc, gain, t } = voice(getCtx(), "sine", 0, 0.15);
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
}

/** Rising bass sweep — adding a read replica connection */
export function playConnectionSound() {
  if (isMuted()) return;
  const { osc, gain, t } = voice(getCtx(), "sine", 0, 0.4);
  osc.frequency.setValueAtTime(100, t);
  osc.frequency.exponentialRampToValueAtTime(260, t + 0.35);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.linearRampToValueAtTime(0.08, t + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
}

/**
 * Sound for toggling a region on/off. Mirrors the database-store toggle
 * semantics: active region → deselect, first pick → select, replica → connect.
 */
export function playRegionToggleSound(isActive: boolean, hasPrimary: boolean) {
  if (isActive) playDeselectSound();
  else if (!hasPrimary) playSelectSound();
  else playConnectionSound();
}

/** Packet launch — client sends write to primary */
export function playPacketSendSound() {
  if (isMuted()) return;
  const c = getCtx();

  // Bass layer
  const bass = voice(c, "sine", 0, 0.35);
  bass.osc.frequency.setValueAtTime(90, bass.t);
  bass.osc.frequency.exponentialRampToValueAtTime(200, bass.t + 0.25);
  bass.gain.gain.setValueAtTime(0.15, bass.t);
  bass.gain.gain.exponentialRampToValueAtTime(0.001, bass.t + 0.35);

  // Shimmer layer
  const shimmer = voice(c, "triangle", 0, 0.25);
  shimmer.osc.frequency.setValueAtTime(400, shimmer.t);
  shimmer.osc.frequency.exponentialRampToValueAtTime(800, shimmer.t + 0.2);
  shimmer.gain.gain.setValueAtTime(0.04, shimmer.t);
  shimmer.gain.gain.exponentialRampToValueAtTime(0.001, shimmer.t + 0.25);
}

/** Confirmation ping — primary acknowledged write */
export function playAckSound() {
  if (isMuted()) return;
  const { osc, gain, t } = voice(getCtx(), "sine", 0, 0.2);
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.setValueAtTime(660, t + 0.06);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.linearRampToValueAtTime(0.08, t + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
}

/** Fan-out whoosh — replication starting to replicas */
export function playReplicateSound() {
  if (isMuted()) return;
  const c = getCtx();

  // Low sweep
  const sweep = voice(c, "sine", 0, 0.5);
  sweep.osc.frequency.setValueAtTime(120, sweep.t);
  sweep.osc.frequency.exponentialRampToValueAtTime(300, sweep.t + 0.4);
  sweep.gain.gain.setValueAtTime(0.1, sweep.t);
  sweep.gain.gain.exponentialRampToValueAtTime(0.001, sweep.t + 0.5);

  // Noise-like texture via detuned triangle
  const texture = voice(c, "triangle", 0, 0.4);
  texture.osc.frequency.setValueAtTime(180, texture.t);
  texture.osc.frequency.exponentialRampToValueAtTime(450, texture.t + 0.35);
  texture.osc.detune.setValueAtTime(50, texture.t);
  texture.gain.gain.setValueAtTime(0.04, texture.t);
  texture.gain.gain.exponentialRampToValueAtTime(0.001, texture.t + 0.4);
}

/** Soft arrival blip — replica received data */
export function playReplicaArriveSound() {
  if (isMuted()) return;
  const { osc, gain, t } = voice(getCtx(), "sine", 0, 0.12);
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(550, t + 0.06);
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
}

/** Two-tone chime — response data arrived back at client */
export function playResponseSound() {
  if (isMuted()) return;
  const c = getCtx();

  // First note (high)
  const first = voice(c, "sine", 0, 0.15);
  first.osc.frequency.setValueAtTime(660, first.t);
  first.gain.gain.setValueAtTime(0.1, first.t);
  first.gain.gain.exponentialRampToValueAtTime(0.001, first.t + 0.15);

  // Second note (higher, slightly delayed)
  const second = voice(c, "sine", 0.08, 0.25);
  second.osc.frequency.setValueAtTime(880, second.t + 0.08);
  second.gain.gain.setValueAtTime(0, second.t);
  second.gain.gain.setValueAtTime(0.08, second.t + 0.08);
  second.gain.gain.exponentialRampToValueAtTime(0.001, second.t + 0.25);
}

/** Descending tone — stale read detected */
export function playStaleSound() {
  if (isMuted()) return;
  const { osc, gain, t } = voice(getCtx(), "sine", 0, 0.3);
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(220, t + 0.25);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
}

/** Harsh descending alarm — primary failure */
export function playFailureAlarmSound() {
  if (isMuted()) return;
  const c = getCtx();

  const alarm = voice(c, "sawtooth", 0, 0.5);
  alarm.osc.frequency.setValueAtTime(600, alarm.t);
  alarm.osc.frequency.exponentialRampToValueAtTime(150, alarm.t + 0.4);
  alarm.gain.gain.setValueAtTime(0.08, alarm.t);
  alarm.gain.gain.exponentialRampToValueAtTime(0.001, alarm.t + 0.5);

  const rumble = voice(c, "sine", 0, 0.35);
  rumble.osc.frequency.setValueAtTime(80, rumble.t);
  rumble.osc.frequency.exponentialRampToValueAtTime(40, rumble.t + 0.3);
  rumble.gain.gain.setValueAtTime(0.15, rumble.t);
  rumble.gain.gain.exponentialRampToValueAtTime(0.001, rumble.t + 0.35);
}

/** Rapid pulsing beeps — election voting */
export function playElectionPulseSound() {
  if (isMuted()) return;
  const c = getCtx();

  for (let i = 0; i < 3; i++) {
    const { osc, gain, t } = voice(c, "sine", i * 0.12, i * 0.12 + 0.1);
    osc.frequency.setValueAtTime(300 + i * 80, t + i * 0.12);
    gain.gain.setValueAtTime(0, t);
    gain.gain.setValueAtTime(0.08, t + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.1);
  }
}

/** Rising major resolution — new leader elected / recovery */
export function playRecoveryChimeSound() {
  if (isMuted()) return;
  const c = getCtx();

  const notes = [440, 554, 659];
  notes.forEach((freq, i) => {
    const { osc, gain, t } = voice(c, "sine", i * 0.1, i * 0.1 + 0.3);
    osc.frequency.setValueAtTime(freq, t + i * 0.1);
    gain.gain.setValueAtTime(0, t);
    gain.gain.setValueAtTime(0.07, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
  });
}
