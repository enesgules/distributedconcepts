"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Region } from "@/lib/regions";
import { latLonToVector3 } from "@/lib/geo-utils";
import { GLOBE_RADIUS } from "./Globe";
import RegionTooltip, { type NavigationHint } from "./RegionTooltip";

interface RegionMarkerProps {
  regions: Region[];
  lat: number;
  lon: number;
  isSelected?: boolean;
  isPrimary?: boolean;
  isDimmed?: boolean;
  panelHovered?: boolean;
  reducedMotion?: boolean;
  onClick?: (region: Region) => void;
  navigationHint?: NavigationHint;
  isHintActive?: boolean;
  onHintClick?: () => void;
}

const MARKER_RADIUS = 0.032;
const MARKER_HIT_RADIUS = 0.12;
const MARKER_ELEVATION = 0.025;

export default function RegionMarker({
  regions,
  lat,
  lon,
  isSelected = false,
  isPrimary = false,
  isDimmed = false,
  panelHovered = false,
  reducedMotion = false,
  onClick,
  navigationHint,
  isHintActive = false,
  onHintClick,
}: RegionMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef =
    useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null);
  const [hovered, setHovered] = useState(false);
  const showTooltip = hovered || panelHovered || isHintActive;

  const position = useMemo(
    () => latLonToVector3(lat, lon, GLOBE_RADIUS + MARKER_ELEVATION),
    [lat, lon]
  );

  const handlePointerOver = useCallback(() => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (navigationHint && onHintClick) {
      onHintClick();
    }
    onClick?.(regions[0]);
  }, [onClick, regions, navigationHint, onHintClick]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = reducedMotion
      ? 1
      : Math.sin(state.clock.elapsedTime * 2 + lat) * 0.15 + 1;
    const isHighlighted = hovered || panelHovered;
    const scale = isHighlighted
      ? 1.8
      : isSelected || isPrimary
        ? 1.4
        : isDimmed
          ? 0.72
          : pulse;
    meshRef.current.scale.setScalar(scale);

    if (glowRef.current) {
      const glowScale = isHighlighted ? 3.2 : isDimmed ? 1.25 : pulse * 2.2;
      glowRef.current.scale.setScalar(glowScale);
      glowRef.current.material.opacity = isHighlighted
        ? 0.5
        : isDimmed
          ? 0.04
          : 0.3;
    }
  });

  const color = isPrimary
    ? "#fbbf24"
    : isSelected
      ? "#34d399"
      : isDimmed
        ? "#52525b"
        : "#f0f0f0";
  const glowColor = isPrimary ? "#fbbf24" : "#34d399";

  return (
    <group position={position}>
      {onClick ? (
        <mesh
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <sphereGeometry args={[MARKER_HIT_RADIUS, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}

      {/* Core dot — bright white so it's visible on both day and night */}
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[MARKER_RADIUS, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Emerald glow around the dot */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[MARKER_RADIUS, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.2} />
      </mesh>

      {showTooltip && <RegionTooltip regions={regions} navigationHint={isHintActive ? navigationHint : undefined} />}
    </group>
  );
}
