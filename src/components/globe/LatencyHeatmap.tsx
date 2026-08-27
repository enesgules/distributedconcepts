"use client";

import { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo-utils";
import { getRegionById, type Region } from "@/lib/regions";
import { compareLatency } from "@/lib/simulation/latency";
import { useDatabaseStore } from "@/lib/store/database-store";
import { GLOBE_RADIUS } from "./Globe";

const ZONES = [
  { lat: 34, lon: -78, radius: 0.22 },
  { lat: 33, lon: -115, radius: 0.2 },
  { lat: 54, lon: -100, radius: 0.22 },
  { lat: -15, lon: -50, radius: 0.26 },
  { lat: -33, lon: -66, radius: 0.2 },
  { lat: 48, lon: 3, radius: 0.2 },
  { lat: 60, lon: 18, radius: 0.18 },
  { lat: 50, lon: 28, radius: 0.2 },
  { lat: 28, lon: 15, radius: 0.22 },
  { lat: 7, lon: 4, radius: 0.2 },
  { lat: -4, lon: 35, radius: 0.2 },
  { lat: -28, lon: 25, radius: 0.18 },
  { lat: 28, lon: 47, radius: 0.22 },
  { lat: 22, lon: 78, radius: 0.24 },
  { lat: 35, lon: 105, radius: 0.24 },
  { lat: 32, lon: 135, radius: 0.14 },
  { lat: 6, lon: 108, radius: 0.22 },
  { lat: -27, lon: 135, radius: 0.26 },
] as const;

interface ZoneResult {
  lat: number;
  lon: number;
  radius: number;
  latency: number;
  color: string;
}

function latencyColor(latencyMs: number): string {
  if (latencyMs <= 15) return "#10b981";
  if (latencyMs <= 40) return "#84cc16";
  if (latencyMs <= 80) return "#eab308";
  if (latencyMs <= 150) return "#f97316";
  return "#ef4444";
}

function computeZones(activeRegions: Region[]): ZoneResult[] {
  return ZONES.map((zone) => {
    let shortestLatency = Number.POSITIVE_INFINITY;

    for (const region of activeRegions) {
      shortestLatency = Math.min(
        shortestLatency,
        compareLatency(zone.lat, zone.lon, region.lat, region.lon)
      );
    }

    return {
      ...zone,
      latency: shortestLatency,
      color: latencyColor(shortestLatency),
    };
  });
}

function ZoneOverlays({ zones }: { zones: ZoneResult[] }) {
  const discsRef = useRef<THREE.InstancedMesh>(null);
  const ringsRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!discsRef.current || !ringsRef.current) return;

    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    const surfaceNormal = new THREE.Vector3(0, 0, 1);

    zones.forEach((zone, index) => {
      const position = latLonToVector3(zone.lat, zone.lon, GLOBE_RADIUS + 0.015);

      transform.position.copy(position);
      transform.quaternion.setFromUnitVectors(surfaceNormal, position.clone().normalize());
      transform.scale.set(zone.radius, zone.radius, 1);
      transform.updateMatrix();

      discsRef.current?.setMatrixAt(index, transform.matrix);
      discsRef.current?.setColorAt(index, color.set(zone.color));
      ringsRef.current?.setMatrixAt(index, transform.matrix);
      ringsRef.current?.setColorAt(index, color.set(zone.color));
    });

    discsRef.current.instanceMatrix.needsUpdate = true;
    ringsRef.current.instanceMatrix.needsUpdate = true;
    if (discsRef.current.instanceColor) discsRef.current.instanceColor.needsUpdate = true;
    if (ringsRef.current.instanceColor) ringsRef.current.instanceColor.needsUpdate = true;
  }, [zones]);

  return (
    <>
      <instancedMesh ref={discsRef} args={[undefined, undefined, zones.length]} frustumCulled={false}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial transparent opacity={0.18} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={ringsRef} args={[undefined, undefined, zones.length]} frustumCulled={false}>
        <ringGeometry args={[0.975, 1, 32]} />
        <meshBasicMaterial transparent opacity={0.36} depthWrite={false} />
      </instancedMesh>
    </>
  );
}

const cameraDirection = new THREE.Vector3();

function ZoneLabel({ zone }: { zone: ZoneResult }) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const position = useMemo(
    () => latLonToVector3(zone.lat, zone.lon, GLOBE_RADIUS + 0.04),
    [zone.lat, zone.lon]
  );
  const normal = useMemo(() => position.clone().normalize(), [position]);

  useFrame(({ camera }) => {
    if (!labelRef.current) return;
    const isVisible = normal.dot(cameraDirection.copy(camera.position).normalize()) > 0.12;
    labelRef.current.style.opacity = isVisible ? "1" : "0";
  });

  return (
    <Html
      position={position}
      center
      distanceFactor={8}
      zIndexRange={[1, 0]}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <span
        ref={labelRef}
        aria-hidden="true"
        className="rounded-full bg-zinc-950/85 px-1.5 py-px font-mono text-[8px] font-semibold transition-opacity duration-150"
        style={{ color: zone.color, boxShadow: `inset 0 0 0 1px ${zone.color}33` }}
      >
        {zone.latency}ms
      </span>
    </Html>
  );
}

export default function LatencyHeatmap() {
  const primaryRegionId = useDatabaseStore((state) => state.primaryRegion);
  const readRegionIds = useDatabaseStore((state) => state.readRegions);
  const zones = useMemo(() => {
    if (!primaryRegionId) return [];

    const activeRegions = [primaryRegionId, ...readRegionIds].flatMap((regionId) => {
      const region = getRegionById(regionId);
      return region ? [region] : [];
    });

    return computeZones(activeRegions);
  }, [primaryRegionId, readRegionIds]);

  if (zones.length === 0) return null;

  return (
    <group>
      <ZoneOverlays zones={zones} />
      {zones.map((zone) => (
        <ZoneLabel key={`${zone.lat}:${zone.lon}`} zone={zone} />
      ))}
    </group>
  );
}
