"use client";

import { useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { computeArcPoints } from "@/lib/arc-utils";

interface ConnectionArcProps {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  color?: string;
}

export default function ConnectionArc({
  startLat,
  startLon,
  endLat,
  endLon,
  color = "#10b981",
}: ConnectionArcProps) {
  const [progress, setProgress] = useState(0);

  const allPoints = useMemo(
    () => computeArcPoints(startLat, startLon, endLat, endLon),
    [startLat, startLon, endLat, endLon]
  );

  // Animate draw-in over 0.8s
  useFrame((_, delta) => {
    if (progress < 1) {
      setProgress((p) => Math.min(p + delta / 0.8, 1));
    }
  });

  const visibleCount = Math.max(2, Math.ceil(progress * allPoints.length));
  const visiblePoints = allPoints.slice(0, visibleCount);

  return (
    <Line
      points={visiblePoints}
      color={color}
      lineWidth={1.5}
      transparent
      opacity={0.6 + progress * 0.2}
    />
  );
}
