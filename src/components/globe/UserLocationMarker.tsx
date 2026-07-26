"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo-utils";
import { findNearestRegion } from "@/lib/simulation/latency";
import { useDatabaseStore } from "@/lib/store/database-store";
import { regions } from "@/lib/regions";
import { GLOBE_RADIUS } from "./Globe";

const MARKER_ELEVATION = 0.02;
const SKY_COLOR = "#38bdf8";
const ARC_SEGMENTS = 48;
const RING_COUNT = 3;

// Reused across frames to avoid allocating a Vector3 per frame
const _camDir = new THREE.Vector3();

interface UserLocationMarkerProps {
  lat: number;
  lon: number;
  showDbConnection?: boolean;
  reducedMotion?: boolean;
}

function buildArc(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): THREE.Vector3[] {
  const start = latLonToVector3(startLat, startLon, GLOBE_RADIUS);
  const end = latLonToVector3(endLat, endLon, GLOBE_RADIUS);
  const elevation = GLOBE_RADIUS + 0.025;

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;
    const point = start
      .clone()
      .lerp(end, t)
      .normalize()
      .multiplyScalar(elevation);
    points.push(point);
  }
  return points;
}

/** A single expanding ring that fades out as it grows */
function PulseRing({
  index,
  normal,
  reducedMotion,
}: {
  index: number;
  normal: THREE.Vector3;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>>(null);

  const quaternion = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal
      ),
    [normal]
  );

  useFrame((state) => {
    if (!ref.current) return;
    if (reducedMotion) {
      ref.current.scale.setScalar(0.055 + index * 0.018);
      ref.current.material.opacity = index === 0 ? 0.28 : 0.1;
      return;
    }
    // Stagger each ring by phase offset
    const phase = (state.clock.elapsedTime * 0.8 + index * (1 / RING_COUNT)) % 1;
    const scale = 0.02 + phase * 0.12;
    ref.current.scale.setScalar(scale);
    ref.current.material.opacity = (1 - phase) * 0.4;
  });

  return (
    <mesh ref={ref} quaternion={quaternion}>
      <ringGeometry args={[0.85, 1, 32]} />
      <meshBasicMaterial
        color={SKY_COLOR}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function UserLocationMarker({
  lat,
  lon,
  showDbConnection = false,
  reducedMotion = false,
}: UserLocationMarkerProps) {
  const dotRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const handlePointerOver = useCallback(() => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const hasDatabase = !!primaryRegion;

  const position = useMemo(
    () => latLonToVector3(lat, lon, GLOBE_RADIUS + MARKER_ELEVATION),
    [lat, lon]
  );

  const normal = useMemo(() => position.clone().normalize(), [position]);

  const nearest = useMemo(() => {
    const pool =
      showDbConnection && primaryRegion
        ? [primaryRegion, ...readRegions]
        : regions.map((r) => r.id);
    return findNearestRegion(lat, lon, pool);
  }, [lat, lon, showDbConnection, primaryRegion, readRegions]);

  const latency = nearest?.latencyMs ?? null;

  const arcPoints = useMemo(() => {
    if (!nearest) return null;
    return buildArc(lat, lon, nearest.region.lat, nearest.region.lon);
  }, [lat, lon, nearest]);

  const labelPos = useMemo(
    () => latLonToVector3(lat, lon, GLOBE_RADIUS + 0.07),
    [lat, lon]
  );

  const badgeRef = useRef<HTMLDivElement>(null);

  useFrame((state) => {
    if (dotRef.current) {
      const pulse = reducedMotion
        ? 1
        : Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
      dotRef.current.scale.setScalar(pulse);
    }
    // Hide badge when behind the globe
    if (badgeRef.current) {
      const dot = normal.dot(_camDir.copy(state.camera.position).normalize());
      badgeRef.current.style.opacity = dot > 0.05 ? "1" : "0";
    }
  });

  return (
    <group>
      {/* Center dot — small bright cyan */}
      <mesh
        ref={dotRef}
        position={position}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color={SKY_COLOR} />
      </mesh>

      {/* Expanding radar-ping rings */}
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <group key={i} position={position}>
          <PulseRing
            index={i}
            normal={normal}
            reducedMotion={reducedMotion}
          />
        </group>
      ))}

      {/* Arc to nearest active region (only when database configured and page opts in) */}
      {showDbConnection && arcPoints && (
        <Line
          points={arcPoints}
          color={SKY_COLOR}
          lineWidth={1.5}
          transparent
          opacity={0.35}
        />
      )}

      {/* Persistent latency badge — only when a database is configured and page opts in */}
      {showDbConnection && hasDatabase && nearest && latency !== null && (
        <Html
          position={labelPos}
          center
          distanceFactor={8}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div ref={badgeRef} className="flex flex-col items-center transition-opacity duration-150">
            <span
              className="whitespace-nowrap rounded-full px-1.5 py-px font-mono text-[8px] font-semibold"
              style={{
                color: SKY_COLOR,
                backgroundColor: "rgba(9, 9, 11, 0.85)",
                border: `1px solid rgba(56, 189, 248, 0.2)`,
              }}
            >
              {latency}ms
            </span>
          </div>
        </Html>
      )}

      {/* Tooltip — only on hover */}
      {hovered && (
        <Html
          position={labelPos}
          center
          distanceFactor={5}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: "none", transform: "translateY(-24px)" }}
        >
          <div className="whitespace-nowrap rounded-lg border border-sky-500/30 bg-zinc-950/95 px-3 py-2 shadow-[0_0_12px_rgba(56,189,248,0.15)] backdrop-blur-md">
            <span className="text-[13px] font-semibold text-sky-400">
              You are here
            </span>
            {nearest && (
              <div className="mt-1 text-[10px] font-mono text-zinc-400">
                {nearest.latencyMs}ms to {nearest.region.city}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
