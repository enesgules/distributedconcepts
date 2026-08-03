"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useConsistencyRaceStore } from "@/lib/store/consistency-race-store";
import { getRegionById } from "@/lib/regions";
import { computeArcPoints } from "@/lib/arc-utils";
import ClientMarker from "./ClientMarker";
import DataPacket from "./DataPacket";
import PrimaryFlash from "./PrimaryFlash";

interface Props {
  replicaRegionId: string;
}

export default function ConsistencyRaceVisualization({
  replicaRegionId,
}: Props) {
  const primaryRegionId = useDatabaseStore((s) => s.primaryRegion);

  const clientLocation = useConsistencyRaceStore((s) => s.clientLocation);
  const phase = useConsistencyRaceStore((s) => s.phase);
  const writeProgress = useConsistencyRaceStore((s) => s.writeProgress);
  const replicationProgress = useConsistencyRaceStore(
    (s) => s.replicationProgress
  );
  const readProgress = useConsistencyRaceStore((s) => s.readProgress);
  const readStarted = useConsistencyRaceStore((s) => s.readStarted);
  const isStale = useConsistencyRaceStore((s) => s.isStale);

  const primary = primaryRegionId ? getRegionById(primaryRegionId) : null;
  const replica = getRegionById(replicaRegionId);

  // Arc: client → primary
  const writeArc = useMemo(() => {
    if (!clientLocation || !primary) return null;
    return computeArcPoints(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );
  }, [clientLocation, primary]);

  // Arc: primary → replica (replication)
  const replicationArc = useMemo(() => {
    if (!primary || !replica) return null;
    return computeArcPoints(primary.lat, primary.lon, replica.lat, replica.lon);
  }, [primary, replica]);

  // Arc: client → replica
  const readArc = useMemo(() => {
    if (!clientLocation || !replica) return null;
    return computeArcPoints(
      clientLocation.lat,
      clientLocation.lon,
      replica.lat,
      replica.lon
    );
  }, [clientLocation, replica]);

  useFrame((_, delta) => {
    useConsistencyRaceStore.getState().tick(delta);
  });

  const isAnimating = phase !== "idle" && phase !== "complete";

  return (
    <group>
      {/* Client marker */}
      {clientLocation && (
        <ClientMarker lat={clientLocation.lat} lon={clientLocation.lon} />
      )}

      {/* Write arc + packet: client → primary */}
      {writeArc && isAnimating && (
        <group>
          <Line
            points={writeArc}
            color="#06b6d4"
            lineWidth={1}
            transparent
            opacity={0.3}
          />
          {phase === "writing" && (
            <DataPacket
              arcPoints={writeArc}
              progress={writeProgress}
              color="#06b6d4"
            />
          )}
        </group>
      )}

      {/* Primary flash on write ack */}
      {primary && (
        <PrimaryFlash
          lat={primary.lat}
          lon={primary.lon}
          active={phase === "write-ack"}
        />
      )}

      {/* Replication arc: primary → replica */}
      {replicationArc && (phase === "racing" || phase === "result" || phase === "complete") && (
        <group>
          <Line
            points={replicationArc.slice(
              0,
              Math.max(2, Math.ceil(replicationProgress * replicationArc.length))
            )}
            color="#10b981"
            lineWidth={1}
            transparent
            opacity={0.4}
          />
          {phase === "racing" && replicationProgress > 0 && replicationProgress < 1 && (
            <DataPacket
              arcPoints={replicationArc}
              progress={replicationProgress}
              color="#10b981"
            />
          )}
        </group>
      )}

      {/* Read arc + packet: client → replica */}
      {readArc && readStarted && (phase === "racing" || phase === "result" || phase === "complete") && (
        <group>
          <Line
            points={readArc}
            color="#f59e0b"
            lineWidth={1}
            transparent
            opacity={0.3}
          />
          {phase === "racing" && readStarted && (
            <DataPacket
              arcPoints={readArc}
              progress={readProgress}
              color="#f59e0b"
            />
          )}
        </group>
      )}

      {/* Result flash at replica */}
      {replica && (phase === "result" || phase === "complete") && (
        <PrimaryFlash
          lat={replica.lat}
          lon={replica.lon}
          active={phase === "result"}
          color={isStale ? "#ef4444" : "#10b981"}
        />
      )}
    </group>
  );
}
