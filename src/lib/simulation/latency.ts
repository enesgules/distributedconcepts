import { calculateDistance } from "@/lib/geo-utils";
import { getRegionById, type Region } from "@/lib/regions";

const SPEED_OF_LIGHT_KM_S = 299_792;
const NETWORK_OVERHEAD = 2.2;
const BASE_LATENCY_MS = 1;
const JITTER_RANGE = 0.12; // ±12% random variation
const GLOBAL_COVERAGE_SAMPLE_COUNT = 50;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export type RandomSource = () => number;

const GLOBAL_COVERAGE_SAMPLES = Array.from(
  { length: GLOBAL_COVERAGE_SAMPLE_COUNT },
  (_, index) => {
    const y = 1 - (2 * (index + 0.5)) / GLOBAL_COVERAGE_SAMPLE_COUNT;
    return {
      lat: Math.asin(y) * (180 / Math.PI),
      lon: (((index * GOLDEN_ANGLE + Math.PI) % (2 * Math.PI)) - Math.PI) *
        (180 / Math.PI),
    };
  }
);

// ── Real-world latency lookup (CloudPing P50 median values) ─────────
// Key format: "regionA,regionB" (alphabetically sorted)

const MEASURED_LATENCIES: Record<string, number> = {
  "af-south-1,ap-northeast-1": 305,
  "af-south-1,ap-south-1": 184,
  "af-south-1,ap-southeast-1": 247,
  "af-south-1,ap-southeast-2": 327,
  "af-south-1,ca-central-1": 225,
  "af-south-1,eu-central-1": 155,
  "af-south-1,eu-west-1": 160,
  "af-south-1,eu-west-2": 147,
  "af-south-1,sa-east-1": 337,
  "af-south-1,us-east-1": 227,
  "af-south-1,us-east-2": 238,
  "af-south-1,us-west-1": 286,
  "af-south-1,us-west-2": 274,
  "ap-northeast-1,ap-south-1": 128,
  "ap-northeast-1,ap-southeast-1": 70,
  "ap-northeast-1,ap-southeast-2": 115,
  "ap-northeast-1,ca-central-1": 154,
  "ap-northeast-1,eu-central-1": 226,
  "ap-northeast-1,eu-west-1": 203,
  "ap-northeast-1,eu-west-2": 214,
  "ap-northeast-1,sa-east-1": 260,
  "ap-northeast-1,us-east-1": 149,
  "ap-northeast-1,us-east-2": 135,
  "ap-northeast-1,us-west-1": 109,
  "ap-northeast-1,us-west-2": 99,
  "ap-south-1,ap-southeast-1": 62,
  "ap-south-1,ap-southeast-2": 153,
  "ap-south-1,ca-central-1": 188,
  "ap-south-1,eu-central-1": 114,
  "ap-south-1,eu-west-1": 125,
  "ap-south-1,eu-west-2": 115,
  "ap-south-1,sa-east-1": 297,
  "ap-south-1,us-east-1": 190,
  "ap-south-1,us-east-2": 200,
  "ap-south-1,us-west-1": 237,
  "ap-south-1,us-west-2": 224,
  "ap-southeast-1,ap-southeast-2": 94,
  "ap-southeast-1,ca-central-1": 225,
  "ap-southeast-1,eu-central-1": 160,
  "ap-southeast-1,eu-west-1": 176,
  "ap-southeast-1,eu-west-2": 173,
  "ap-southeast-1,sa-east-1": 325,
  "ap-southeast-1,us-east-1": 217,
  "ap-southeast-1,us-east-2": 208,
  "ap-southeast-1,us-west-1": 176,
  "ap-southeast-1,us-west-2": 166,
  "ap-southeast-2,ca-central-1": 198,
  "ap-southeast-2,eu-central-1": 253,
  "ap-southeast-2,eu-west-1": 255,
  "ap-southeast-2,eu-west-2": 266,
  "ap-southeast-2,sa-east-1": 311,
  "ap-southeast-2,us-east-1": 199,
  "ap-southeast-2,us-east-2": 188,
  "ap-southeast-2,us-west-1": 139,
  "ap-southeast-2,us-west-2": 141,
  "ca-central-1,eu-central-1": 93,
  "ca-central-1,eu-west-1": 69,
  "ca-central-1,eu-west-2": 78,
  "ca-central-1,sa-east-1": 126,
  "ca-central-1,us-east-1": 16,
  "ca-central-1,us-east-2": 26,
  "ca-central-1,us-west-1": 79,
  "ca-central-1,us-west-2": 61,
  "eu-central-1,eu-west-1": 22,
  "eu-central-1,eu-west-2": 15,
  "eu-central-1,sa-east-1": 204,
  "eu-central-1,us-east-1": 94,
  "eu-central-1,us-east-2": 103,
  "eu-central-1,us-west-1": 153,
  "eu-central-1,us-west-2": 143,
  "eu-west-1,eu-west-2": 12,
  "eu-west-1,sa-east-1": 178,
  "eu-west-1,us-east-1": 70,
  "eu-west-1,us-east-2": 80,
  "eu-west-1,us-west-1": 130,
  "eu-west-1,us-west-2": 119,
  "eu-west-2,sa-east-1": 187,
  "eu-west-2,us-east-1": 78,
  "eu-west-2,us-east-2": 89,
  "eu-west-2,us-west-1": 147,
  "eu-west-2,us-west-2": 128,
  "sa-east-1,us-east-1": 115,
  "sa-east-1,us-east-2": 124,
  "sa-east-1,us-west-1": 174,
  "sa-east-1,us-west-2": 174,
  "us-east-1,us-east-2": 13,
  "us-east-1,us-west-1": 59,
  "us-east-1,us-west-2": 66,
  "us-east-2,us-west-1": 50,
  "us-east-2,us-west-2": 59,
  "us-west-1,us-west-2": 24,
};

/** Look up a pair key (sorted alphabetically). */
function lookupKey(a: string, b: string): string {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

// GCP → co-located AWS region mapping for lookup fallback
const GCP_TO_AWS: Record<string, string> = {
  "us-east4": "us-east-1",
  "us-central1": "us-east-2", // closest AWS equivalent
  "europe-west1": "eu-west-2", // Belgium ≈ London
};

/**
 * Look up real-world latency between two region IDs.
 * Returns the measured value if available, otherwise falls back to formula.
 */
function lookupRegionLatency(idA: string, idB: string): number | null {
  // Resolve GCP regions to their co-located AWS equivalents
  const awsA = GCP_TO_AWS[idA] ?? idA;
  const awsB = GCP_TO_AWS[idB] ?? idB;

  if (awsA === awsB) return 1; // same or co-located

  const key = lookupKey(awsA, awsB);
  const measured = MEASURED_LATENCIES[key];
  if (measured !== undefined) return measured;

  return null; // no measured data — caller should use formula
}

// ── Formula-based estimation (for arbitrary lat/lon, e.g. heatmap) ──

function formulaLatencyMs(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const distanceKm = calculateDistance(lat1, lon1, lat2, lon2);
  const roundTripMs = (distanceKm / SPEED_OF_LIGHT_KM_S) * 1000 * 2;
  return BASE_LATENCY_MS + roundTripMs * NETWORK_OVERHEAD;
}

function jitter(random: RandomSource): number {
  return 1 + (random() * 2 - 1) * JITTER_RANGE;
}

/**
 * Estimate round-trip network latency between two geographic points.
 * Includes slight random jitter to simulate real-world variance.
 */
export function sampleLatency(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  random: RandomSource = Math.random
): number {
  return Math.round(
    formulaLatencyMs(lat1, lon1, lat2, lon2) * jitter(random)
  );
}

/**
 * Deterministic latency estimate (no jitter). Used for heatmap computation
 * where consistency across pixels matters.
 */
export function compareLatency(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return Math.round(formulaLatencyMs(lat1, lon1, lat2, lon2));
}

/**
 * Find the active region with the lowest stable latency from a client
 * position. Returns null when no ids resolve to regions.
 */
export function findNearestRegion(
  lat: number,
  lon: number,
  regionIds: string[]
): { region: Region; latencyMs: number } | null {
  let best: { region: Region; latencyMs: number } | null = null;
  for (const id of regionIds) {
    const region = getRegionById(id);
    if (!region) continue;
    const latencyMs = compareLatency(lat, lon, region.lat, region.lon);
    if (!best || latencyMs < best.latencyMs) {
      best = { region, latencyMs };
    }
  }
  return best;
}

/**
 * How far a read trails replication, in ms. Negative → the read arrives at
 * the replica before the replicated write does, so it sees stale data.
 */
export function staleReadMarginMs(
  readDelayMs: number,
  readLatencyMs: number,
  replicationLatencyMs: number
): number {
  return readDelayMs + readLatencyMs - replicationLatencyMs;
}

/**
 * Get latency between two regions by ID.
 * Uses real CloudPing data when available, falls back to formula.
 */
export function compareLatencyBetweenRegions(
  regionIdA: string,
  regionIdB: string
): number | null {
  const measured = lookupRegionLatency(regionIdA, regionIdB);
  if (measured !== null) return measured;

  const a = getRegionById(regionIdA);
  const b = getRegionById(regionIdB);
  if (!a || !b) return null;
  return compareLatency(a.lat, a.lon, b.lat, b.lon);
}

export function sampleLatencyBetweenRegions(
  regionIdA: string,
  regionIdB: string,
  random: RandomSource = Math.random
): number | null {
  const baseline = compareLatencyBetweenRegions(regionIdA, regionIdB);
  return baseline === null ? null : Math.round(baseline * jitter(random));
}

/**
 * Average replication latency from primary to all read regions.
 */
export function calculateAverageReadLatency(
  primaryId: string,
  readRegionIds: string[]
): number | null {
  if (readRegionIds.length === 0) return null;

  let total = 0;
  let count = 0;
  for (const id of readRegionIds) {
    const latency = compareLatencyBetweenRegions(primaryId, id);
    if (latency === null) continue;
    total += latency;
    count++;
  }
  return count > 0 ? Math.round(total / count) : null;
}

/**
 * Estimate average read latency from random points around the globe
 * to their nearest active region (primary + read replicas).
 */
export function calculateGlobalCoverage(
  primaryId: string,
  readRegionIds: string[]
): number {
  const allIds = [primaryId, ...readRegionIds];
  const allRegions = allIds
    .map(getRegionById)
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  if (allRegions.length === 0) return 999;

  let totalLatency = 0;

  for (const { lat, lon } of GLOBAL_COVERAGE_SAMPLES) {
    let minLatency = Infinity;
    for (const region of allRegions) {
      const latency = compareLatency(lat, lon, region.lat, region.lon);
      if (latency < minLatency) minLatency = latency;
    }
    totalLatency += minLatency;
  }

  return Math.round(totalLatency / GLOBAL_COVERAGE_SAMPLES.length);
}
