"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const TRAIL_LENGTH = 4;

function getPositionAlongArc(
  points: THREE.Vector3[],
  t: number
): THREE.Vector3 {
  const clamped = Math.max(0, Math.min(1, t));
  const index = clamped * (points.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const frac = index - lower;

  if (lower === upper || upper >= points.length) {
    return points[Math.min(lower, points.length - 1)].clone();
  }

  return points[lower].clone().lerp(points[upper], frac);
}

interface DataPacketProps {
  arcPoints: THREE.Vector3[];
  progress: number;
  color?: string;
  size?: number;
}

export default function DataPacket({
  arcPoints,
  progress,
  color = "#10b981",
  size = 0.025,
}: DataPacketProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  // Fixed pool of trail meshes, positioned imperatively each frame —
  // no React state or re-render needed for the trail to move
  const trailRefs = useRef<(THREE.Mesh | null)[]>([]);
  const trailPositions = useRef<THREE.Vector3[]>([]);

  const currentPos = useMemo(
    () => getPositionAlongArc(arcPoints, progress),
    [arcPoints, progress]
  );

  useFrame(({ clock }) => {
    if (!coreRef.current) return;

    coreRef.current.position.copy(currentPos);
    if (glowRef.current) {
      glowRef.current.position.copy(currentPos);
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.2;
      glowRef.current.scale.setScalar(pulse);
    }

    // Update trail history and move the pooled meshes
    const trail = trailPositions.current;
    trail.unshift(currentPos.clone());
    if (trail.length > TRAIL_LENGTH) trail.pop();
    trailRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const pos = trail[i];
      mesh.visible = pos !== undefined;
      if (pos) mesh.position.copy(pos);
    });
  });

  return (
    <group>
      {/* Inner bright sphere */}
      <mesh ref={coreRef} position={currentPos}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef} position={currentPos}>
        <sphereGeometry args={[size * 2.5, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Trail spheres (pooled, driven from useFrame) */}
      {Array.from({ length: TRAIL_LENGTH }, (_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[size * (1 - (i + 1) / (TRAIL_LENGTH + 1)), 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.15 * (1 - (i + 1) / (TRAIL_LENGTH + 1))}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export { getPositionAlongArc };
