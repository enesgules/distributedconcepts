import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo-utils";
import { GLOBE_RADIUS } from "@/components/globe/Globe";

const ARC_SEGMENTS = 64;

/**
 * Build an array of points along a great-circle arc between two lat/lon
 * positions, elevated above the globe surface with a smooth parabolic peak.
 */
export function buildGreatCircleArc(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  segments: number,
  peakHeight: number
): THREE.Vector3[] {
  const start = latLonToVector3(startLat, startLon, GLOBE_RADIUS);
  const end = latLonToVector3(endLat, endLon, GLOBE_RADIUS);

  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    // Spherical interpolation along the great circle
    const point = start.clone().lerp(end, t).normalize();

    // Parabolic elevation: peaks at t=0.5
    const elevation = peakHeight * 4 * t * (1 - t);

    point.multiplyScalar(GLOBE_RADIUS + 0.03 + elevation);
    points.push(point);
  }

  return points;
}

/**
 * Compute arc points between two lat/lon positions with automatic peak height
 * based on angular distance. Shared across all visualization components.
 */
export function computeArcPoints(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): THREE.Vector3[] {
  const start = latLonToVector3(startLat, startLon, GLOBE_RADIUS);
  const end = latLonToVector3(endLat, endLon, GLOBE_RADIUS);
  const angularDistance = start.angleTo(end);
  const peakHeight = 0.15 + (angularDistance / Math.PI) * 0.6;
  return buildGreatCircleArc(
    startLat,
    startLon,
    endLat,
    endLon,
    ARC_SEGMENTS,
    peakHeight
  );
}
