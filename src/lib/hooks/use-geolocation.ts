"use client";

import { useSyncExternalStore } from "react";
import type { LatLon } from "@/lib/geo-utils";

let cachedPosition: LatLon | null = null;
let requested = false;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Trigger geolocation request on first subscribe (client-only)
  if (!requested) {
    requested = true;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          cachedPosition = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          listeners.forEach((fn) => fn());
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    }
  }
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): LatLon | null {
  return cachedPosition;
}

function getServerSnapshot(): LatLon | null {
  return null;
}

export function useGeolocation(): LatLon | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
