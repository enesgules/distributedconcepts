"use client";

import { Suspense, useEffect, useRef, useMemo, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import Globe from "./Globe";
import RegionMarker from "./RegionMarker";
import { type NavigationHint } from "./RegionTooltip";
import UserLocationMarker from "./UserLocationMarker";
import { regions, groupRegionsByLocation, getRegionById, type Region } from "@/lib/regions";
import { latLonToVector3, vector3ToLatLon } from "@/lib/geo-utils";
import { useDatabaseStore } from "@/lib/store/database-store";
import { GLOBE_RADIUS } from "./Globe";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { useReducedMotion } from "framer-motion";

function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

/**
 * Smoothly rotates the camera to face a hovered region.
 * Pauses auto-rotate while a region is hovered from the panel.
 */
// Reused across frames to avoid allocating a Vector3 per frame
const _cameraGoal = new THREE.Vector3();

function CameraController({
  controlsRef,
  cameraTarget,
  reducedMotion,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  cameraTarget?: { lat: number; lon: number } | null;
  reducedMotion: boolean;
}) {
  const hoveredRegionId = useDatabaseStore((s) => s.hoveredRegionId);
  const { camera } = useThree();
  const targetDir = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    // cameraTarget prop takes priority over hovered region
    if (cameraTarget) {
      targetDir.current = latLonToVector3(cameraTarget.lat, cameraTarget.lon, 1);
    } else if (hoveredRegionId) {
      const region = getRegionById(hoveredRegionId);
      if (region) {
        targetDir.current = latLonToVector3(region.lat, region.lon, 1);
      }
    } else {
      targetDir.current = null;
    }
  }, [cameraTarget, hoveredRegionId]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (targetDir.current) {
      controls.autoRotate = false;
      // Rotate toward region, keeping the user's current zoom distance
      const currentDistance = camera.position.length();
      _cameraGoal.copy(targetDir.current).multiplyScalar(currentDistance);
      if (reducedMotion) camera.position.copy(_cameraGoal);
      else camera.position.lerp(_cameraGoal, 0.03);
      // Maintain distance (prevent lerp from shrinking it)
      camera.position.normalize().multiplyScalar(currentDistance);
      controls.update();
    } else {
      controls.autoRotate = !reducedMotion;
    }
  });

  return null;
}

interface GlobeSceneProps {
  isMobile?: boolean;
  children?: ReactNode;
  onRegionClick?: (region: Region) => void;
  onGlobeClick?: (lat: number, lon: number) => void;
  selectedRegions?: string[];
  primaryRegion?: string | null;
  onReady?: () => void;
  hideUserLocation?: boolean;
  showUserDbConnection?: boolean;
  regionNavigationHint?: NavigationHint;
  cameraTarget?: { lat: number; lon: number } | null;
  focusSelectedRegions?: boolean;
}

export default function GlobeScene({
  isMobile = false,
  children,
  onRegionClick,
  onGlobeClick,
  selectedRegions = [],
  primaryRegion = null,
  onReady,
  hideUserLocation = false,
  showUserDbConnection = false,
  regionNavigationHint,
  cameraTarget,
  focusSelectedRegions = false,
}: GlobeSceneProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const storePrimary = useDatabaseStore((s) => s.primaryRegion);
  // Only filter by provider when the page explicitly passes primaryRegion
  const activeProvider = primaryRegion && storePrimary ? getRegionById(storePrimary)?.provider : null;
  const regionGroups = useMemo(() => {
    const filtered = activeProvider
      ? regions.filter((r) => r.provider === activeProvider)
      : regions;
    return groupRegionsByLocation(filtered);
  }, [activeProvider]);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const userLocation = useGeolocation();
  const [activeHintKey, setActiveHintKey] = useState<string | null>(null);

  return (
    <Canvas
      camera={{ position: [4.5, 4.4, -3.1], fov: 45 }}
      dpr={[1, isMobile ? 1.5 : 2]}
      gl={{ antialias: true }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <ReadySignal onReady={onReady} />
        <CameraController
          controlsRef={controlsRef}
          cameraTarget={cameraTarget}
          reducedMotion={reducedMotion}
        />

        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} />
        <directionalLight position={[-5, -3, -5]} intensity={0.2} />

        {/* Stars background */}
        <Stars
          radius={300}
          depth={150}
          count={isMobile ? 5000 : 15000}
          factor={20}
          saturation={0}
          fade
          speed={reducedMotion ? 0 : 0.5}
        />

        {/* Globe */}
        <Globe allowHighResolution={!isMobile} />

        {/* Invisible click target for arbitrary globe clicks + hint dismissal */}
        {(onGlobeClick || regionNavigationHint) && (
          <mesh
            visible={false}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              if (regionNavigationHint) setActiveHintKey(null);
              if (onGlobeClick) {
                const { lat, lon } = vector3ToLatLon(e.point);
                onGlobeClick(lat, lon);
              }
            }}
          >
            <sphereGeometry args={[GLOBE_RADIUS, 16, 16]} />
            <meshBasicMaterial />
          </mesh>
        )}

        {/* Region markers (grouped by location) */}
        {regionGroups.map((group) => {
          const isSelected = group.regions.some((region) =>
            selectedRegions.includes(region.id)
          );
          const isPrimary = group.regions.some(
            (region) => region.id === primaryRegion
          );

          return (
            <RegionMarker
              key={group.key}
              regions={group.regions}
              lat={group.lat}
              lon={group.lon}
              isSelected={isSelected}
              isPrimary={isPrimary}
              isDimmed={focusSelectedRegions && !isSelected && !isPrimary}
              reducedMotion={reducedMotion}
              onClick={onRegionClick}
              navigationHint={regionNavigationHint}
              isHintActive={activeHintKey === group.key}
              onHintClick={() =>
                setActiveHintKey((previousKey) =>
                  previousKey === group.key ? null : group.key
                )
              }
            />
          );
        })}

        {/* User's real location */}
        {userLocation && !hideUserLocation && (
          <UserLocationMarker
            lat={userLocation.lat}
            lon={userLocation.lon}
            showDbConnection={showUserDbConnection}
            reducedMotion={reducedMotion}
          />
        )}

        {/* Extensibility: experiences inject arcs, packets, etc. */}
        {children}

        {/* Camera controls */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          minDistance={3.5}
          maxDistance={14}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.1}
          rotateSpeed={0.5}
        />
      </Suspense>
    </Canvas>
  );
}
