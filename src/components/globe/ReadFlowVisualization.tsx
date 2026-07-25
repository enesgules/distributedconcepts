"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useReadFlowStore } from "@/lib/store/read-flow-store";
import { getRegionById } from "@/lib/regions";
import { computeArcPoints } from "@/lib/arc-utils";
import { advance } from "@/lib/simulation/animation";
import ClientMarker from "./ClientMarker";
import DataPacket from "./DataPacket";
import PrimaryFlash from "./PrimaryFlash";
import { playAckSound, playResponseSound } from "@/lib/sounds";

export default function ReadFlowVisualization() {
  const clientLocation = useReadFlowStore((s) => s.clientLocation);
  const phase = useReadFlowStore((s) => s.phase);
  const nearestRegionId = useReadFlowStore((s) => s.nearestRegionId);
  const fetchProgress = useReadFlowStore((s) => s.fetchProgress);
  const responseProgress = useReadFlowStore((s) => s.responseProgress);

  // Resolve nearest region
  const nearestRegion = nearestRegionId ? getRegionById(nearestRegionId) : null;

  // Arc from client to nearest replica
  const clientToNearestArc = useMemo(() => {
    if (!clientLocation || !nearestRegion) return null;
    return computeArcPoints(
      clientLocation.lat,
      clientLocation.lon,
      nearestRegion.lat,
      nearestRegion.lon
    );
  }, [clientLocation, nearestRegion]);

  // Reversed arc for response (nearest → client)
  const nearestToClientArc = useMemo(() => {
    if (!clientToNearestArc) return null;
    return [...clientToNearestArc].reverse();
  }, [clientToNearestArc]);

  // Animation loop
  useFrame((_, delta) => {
    const store = useReadFlowStore.getState();

    if (store.phase === "fetching") {
      const newProgress = advance(
        store.fetchProgress,
        delta,
        store.nearestLatencyMs
      );
      store.setFetchProgress(newProgress);

      if (newProgress >= 1) {
        playAckSound();
        store.onDataFetched();
      }
    }

    if (store.phase === "responding") {
      const newProgress = advance(
        store.responseProgress,
        delta,
        store.nearestLatencyMs
      );
      store.setResponseProgress(newProgress);

      if (newProgress >= 1) {
        playResponseSound();
        store.setPhase("complete");
        useReadFlowStore.setState({ response: '"hello"' });
      }
    }
  });

  const isAnimating = phase !== "idle";

  return (
    <group>
      {/* Client marker */}
      {clientLocation && (
        <ClientMarker lat={clientLocation.lat} lon={clientLocation.lon} />
      )}

      {/* Arc line (visible once animation starts) */}
      {clientToNearestArc && isAnimating && (
        <Line
          points={clientToNearestArc}
          color="#10b981"
          lineWidth={1}
          transparent
          opacity={0.4}
        />
      )}

      {/* Fetch packet: client → nearest (emerald) */}
      {clientToNearestArc && phase === "fetching" && (
        <DataPacket
          arcPoints={clientToNearestArc}
          progress={fetchProgress}
          color="#10b981"
        />
      )}

      {/* Flash at nearest replica */}
      {nearestRegion && (
        <PrimaryFlash
          lat={nearestRegion.lat}
          lon={nearestRegion.lon}
          active={phase === "arriving"}
        />
      )}

      {/* Response packet: nearest → client (cyan) */}
      {nearestToClientArc && phase === "responding" && (
        <DataPacket
          arcPoints={nearestToClientArc}
          progress={responseProgress}
          color="#06b6d4"
        />
      )}
    </group>
  );
}
