"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import ConnectionArcs from "@/components/globe/ConnectionArcs";
import LatencyHeatmap from "@/components/globe/LatencyHeatmap";
import WriteFlowVisualization from "@/components/globe/WriteFlowVisualization";
import ConsistencyRaceVisualization from "@/components/globe/ConsistencyRaceVisualization";
import FailoverVisualization from "@/components/globe/FailoverVisualization";
import BuildPanel from "@/components/panels/BuildPanel";
import WriteLessonPanel from "@/components/panels/WriteLessonPanel";
import RaceLessonPanel from "@/components/panels/RaceLessonPanel";
import FailureLessonPanel from "@/components/panels/FailureLessonPanel";
import CourseHome from "@/components/ui/CourseHome";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useCurriculumProgressStore } from "@/lib/store/curriculum-progress-store";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";
import { useConsistencyRaceStore } from "@/lib/store/consistency-race-store";
import { useFailoverStore } from "@/lib/store/failover-store";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { getRegionById, regions, type Region } from "@/lib/regions";
import { findNearestRegion } from "@/lib/simulation/latency";
import type { StepId } from "@/lib/steps";
import {
  getAdjacentLessonId,
  getLessonUrl,
  getTopologyRequirement,
  isLessonComplete,
  parseCurriculumLocation,
  OPEN_COURSE_EVENT,
} from "@/lib/curriculum-runtime";
import { playRegionToggleSound, playSelectSound } from "@/lib/sounds";

const DEFAULT_CLIENT = { lat: 41, lon: 28.98 };
const ALL_REGION_IDS = regions.map((region) => region.id);

function resetLessonSimulations() {
  useWriteFlowStore.getState().reset();
  useConsistencyRaceStore.getState().reset();
  useFailoverStore.getState().reset();
}

interface DistributedConceptsAppProps {
  initialLessonId?: StepId | null;
  initialView?: "intro" | "course";
}

export function DistributedConceptsApp({
  initialLessonId = null,
  initialView = "intro",
}: DistributedConceptsAppProps) {
  const [activeLessonId, setActiveLessonId] = useState<StepId | null>(initialLessonId);
  const [showCourse, setShowCourse] = useState(initialView === "course");
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const previousLessonId = useRef<StepId | null>(initialLessonId);
  const isHome = activeLessonId === null;
  const isLoaded = minTimeElapsed && globeReady;

  const navigateToLesson = useCallback((lessonId: StepId) => {
    previousLessonId.current = lessonId;
    setActiveLessonId(lessonId);
    setShowCourse(false);
    const url = getLessonUrl(lessonId);
    if (window.location.pathname !== url) window.history.pushState(null, "", url);
  }, []);

  const startCourse = useCallback(() => {
    useDatabaseStore.getState().reset();
    resetLessonSimulations();
    navigateToLesson("build");
  }, [navigateToLesson]);

  const openCourse = useCallback(() => {
    setActiveLessonId(null);
    setShowCourse(true);
    if (window.location.pathname !== "/lessons") {
      window.history.pushState(null, "", "/lessons");
    }
  }, []);

  const closeCourse = useCallback(() => {
    if (previousLessonId.current) {
      navigateToLesson(previousLessonId.current);
      return;
    }
    setShowCourse(false);
    if (window.location.pathname !== "/") window.history.pushState(null, "", "/");
  }, [navigateToLesson]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinTimeElapsed(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const restore = () => {
      const target = parseCurriculumLocation(window.location.pathname);
      if (target.kind === "lesson") {
        previousLessonId.current = target.lessonId;
        setActiveLessonId(target.lessonId);
        setShowCourse(false);
      } else {
        setActiveLessonId(null);
        setShowCourse(target.course);
      }
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_COURSE_EVENT, openCourse);
    return () => window.removeEventListener(OPEN_COURSE_EVENT, openCourse);
  }, [openCourse]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (activeLessonId) openCourse();
        else if (showCourse) closeCourse();
        return;
      }
      if (!activeLessonId || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
      if (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, select")) return;
      const adjacent = getAdjacentLessonId(
        activeLessonId,
        event.key === "ArrowRight" ? "next" : "previous"
      );
      if (adjacent) navigateToLesson(adjacent);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeLessonId, closeCourse, navigateToLesson, openCourse, showCourse]);

  const geo = useGeolocation();
  const suggestedLeader = useMemo(() => {
    const client = geo ?? DEFAULT_CLIENT;
    return findNearestRegion(client.lat, client.lon, ALL_REGION_IDS)?.region ?? null;
  }, [geo]);
  const primaryRegion = useDatabaseStore((state) => state.primaryRegion);
  const readRegions = useDatabaseStore((state) => state.readRegions);

  useEffect(() => {
    if (!activeLessonId || getTopologyRequirement(activeLessonId) === "none") return;
    useDatabaseStore.getState().prepare();
  }, [activeLessonId]);

  useEffect(() => {
    if (!activeLessonId) return;
    if (activeLessonId === "write") {
      const client = geo ?? DEFAULT_CLIENT;
      const write = useWriteFlowStore.getState();
      const locationChanged =
        !write.clientLocation ||
        write.clientLocation.lat !== client.lat ||
        write.clientLocation.lon !== client.lon;
      if (write.phase === "idle" && locationChanged) {
        write.setClientLocation(client.lat, client.lon);
      }
    }
    if (activeLessonId === "stale-read" && readRegions[0]) {
      const replica = getRegionById(readRegions[0]);
      if (replica) {
        const race = useConsistencyRaceStore.getState();
        const locationChanged =
          !race.clientLocation ||
          race.clientLocation.lat !== replica.lat ||
          race.clientLocation.lon !== replica.lon;
        if (race.phase === "idle" && locationChanged) {
          race.setClientLocation(replica.lat, replica.lon);
        }
      }
    }
  }, [activeLessonId, geo, readRegions]);

  const handleRegionClick = useCallback(
    (region: Region) => {
      if (activeLessonId !== "build") return;
      const database = useDatabaseStore.getState();
      if (!primaryRegion) {
        playSelectSound();
        database.setPrimary(region.id);
        resetLessonSimulations();
        return;
      }
      const primary = getRegionById(primaryRegion);
      if (!primary || region.id === primaryRegion || region.provider !== primary.provider) return;
      playRegionToggleSound(false, true);
      for (const replicaId of readRegions) database.removeReadRegion(replicaId);
      database.addReadRegion(region.id);
      resetLessonSimulations();
    },
    [activeLessonId, primaryRegion, readRegions]
  );

  const writePhase = useWriteFlowStore((state) => state.phase);
  const consistencyPhase = useConsistencyRaceStore((state) => state.phase);
  const failoverPhase = useFailoverStore((state) => state.phase);
  const newPrimaryId = useFailoverStore((state) => state.newPrimaryId);
  const completeLesson = useCurriculumProgressStore((state) => state.completeLesson);
  const completionFacts = useMemo(
    () => ({
      primaryRegion,
      readRegionCount: readRegions.length,
      writePhase,
      consistencyPhase,
      failoverPhase,
    }),
    [primaryRegion, readRegions.length, writePhase, consistencyPhase, failoverPhase]
  );
  const currentComplete = activeLessonId
    ? isLessonComplete(activeLessonId, completionFacts)
    : false;

  useEffect(() => {
    if (activeLessonId && currentComplete) completeLesson(activeLessonId);
  }, [activeLessonId, completeLesson, currentComplete]);

  const effectivePrimary = useMemo(() => {
    if (activeLessonId !== "failure" || failoverPhase === "idle") return primaryRegion;
    return failoverPhase === "elected" || failoverPhase === "recovering" || failoverPhase === "complete"
      ? newPrimaryId
      : null;
  }, [activeLessonId, failoverPhase, newPrimaryId, primaryRegion]);

  const failureCameraTarget = useMemo(() => {
    if (activeLessonId !== "failure" || failoverPhase === "complete") return null;
    const regionId = newPrimaryId ?? primaryRegion;
    const region = regionId ? getRegionById(regionId) : null;
    return region ? { lat: region.lat, lon: region.lon } : null;
  }, [activeLessonId, failoverPhase, newPrimaryId, primaryRegion]);

  const replicaRegionId = readRegions[0] ?? null;
  const lessonViews = {
    build: {
      visual: (
        <>
          <LatencyHeatmap />
          <ConnectionArcs />
        </>
      ),
      panel: (
        <BuildPanel
          suggestedLeader={suggestedLeader}
          onNext={() => navigateToLesson("write")}
        />
      ),
    },
    write: {
      visual: (
        <>
          <ConnectionArcs />
          <WriteFlowVisualization />
        </>
      ),
      panel: <WriteLessonPanel onNext={() => navigateToLesson("stale-read")} />,
    },
    "stale-read": {
      visual: (
        <>
          <ConnectionArcs />
          {replicaRegionId ? (
            <ConsistencyRaceVisualization replicaRegionId={replicaRegionId} />
          ) : null}
        </>
      ),
      panel: <RaceLessonPanel onNext={() => navigateToLesson("failure")} />,
    },
    failure: {
      visual: (
        <>
          {failoverPhase === "idle" ? <ConnectionArcs /> : null}
          <FailoverVisualization />
        </>
      ),
      panel: <FailureLessonPanel onFinish={openCourse} />,
    },
  } satisfies Record<StepId, { visual: ReactNode; panel: ReactNode }>;
  const view = activeLessonId ? lessonViews[activeLessonId] : null;

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#0a0a0a]">
      <div
        className={`absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.77,0,0.175,1)] ${
          isHome ? "translate-y-0" : "-translate-y-[24vh] md:translate-y-0"
        }`}
      >
        <GlobeScene
          isMobile={isMobile}
          onReady={() => setGlobeReady(true)}
          onRegionClick={activeLessonId === "build" ? handleRegionClick : undefined}
          selectedRegions={isHome ? [] : readRegions}
          primaryRegion={isHome ? null : activeLessonId === "failure" ? effectivePrimary : primaryRegion}
          hideUserLocation={activeLessonId === "write" || activeLessonId === "stale-read"}
          showUserDbConnection={activeLessonId === "build"}
          cameraTarget={activeLessonId === "failure" ? failureCameraTarget : undefined}
          focusSelectedRegions={activeLessonId !== null && activeLessonId !== "build"}
        >
          {view?.visual}
        </GlobeScene>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-linear-to-b from-[#0a0a0a] via-[#0a0a0a]/55 to-transparent md:h-52" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/65 to-transparent md:h-52" />

      <AnimatePresence initial={false}>
        {isHome ? (
          <CourseHome
            key="course-home"
            expanded={showCourse}
            onExpand={() => {
              setShowCourse(true);
              if (window.location.pathname !== "/lessons") window.history.pushState(null, "", "/lessons");
            }}
            onStart={startCourse}
            onSelectLesson={(lessonId) => {
              if (lessonId === "build") startCourse();
              else navigateToLesson(lessonId);
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {activeLessonId && view ? (
          <motion.main
            key={activeLessonId}
            initial={{ opacity: 0, transform: "translateY(28px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(18px)" }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="fixed bottom-0 left-0 right-0 z-20 h-[54dvh] rounded-t-[1.75rem] p-2 pb-safe md:absolute md:bottom-6 md:mx-auto md:h-auto md:max-h-[calc(100dvh-3rem)] md:w-[min(620px,calc(100vw-3rem))] md:rounded-none md:p-0"
          >
            {view.panel}
          </motion.main>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>{!isLoaded ? <LoadingScreen /> : null}</AnimatePresence>
    </div>
  );
}

export default function Home() {
  return <DistributedConceptsApp />;
}
