"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import ConnectionArcs from "@/components/globe/ConnectionArcs";
import LatencyHeatmap from "@/components/globe/LatencyHeatmap";
import WriteFlowVisualization from "@/components/globe/WriteFlowVisualization";
import ReadFlowVisualization from "@/components/globe/ReadFlowVisualization";
import ConsistencyRaceVisualization from "@/components/globe/ConsistencyRaceVisualization";
import ClientMarker from "@/components/globe/ClientMarker";
import FailoverVisualization from "@/components/globe/FailoverVisualization";
import RegionBuilder from "@/components/panels/RegionBuilder";
import LatencyStats from "@/components/panels/LatencyStats";
import WritePanel from "@/components/panels/WritePanel";
import EventTimeline from "@/components/panels/EventTimeline";
import ReadPanel from "@/components/panels/ReadPanel";
import LatencyComparison from "@/components/panels/LatencyComparison";
import ConsistencyRacePanel from "@/components/panels/ConsistencyRacePanel";
import FailoverPanel from "@/components/panels/FailoverPanel";
import FailoverTimeline from "@/components/panels/FailoverTimeline";
import LearningPathNav from "@/components/ui/LearningPathNav";
import CurriculumHome from "@/components/ui/CurriculumHome";
import HomeIntro from "@/components/ui/HomeIntro";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";
import { useReadFlowStore } from "@/lib/store/read-flow-store";
import { useConsistencyRaceStore } from "@/lib/store/consistency-race-store";
import { useFailoverStore } from "@/lib/store/failover-store";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { getRegionById, regions, type Region } from "@/lib/regions";
import { findNearestRegion } from "@/lib/simulation/latency";
import {
  STEPS,
  LAST_STEP,
  getStepIndexBySlug,
  type ChapterId,
} from "@/lib/steps";
import { OPEN_CURRICULUM_EVENT } from "@/lib/navigation";
import { playSelectSound, playRegionToggleSound } from "@/lib/sounds";

// Fallback client position when geolocation is unavailable (Istanbul \u2014
// deliberately not an existing region, so routing stays interesting)
const DEFAULT_CLIENT = { lat: 41.0, lon: 28.98 };
const ALL_REGION_IDS = regions.map((region) => region.id);
const HOME_STEP = -1;

type LocationTarget =
  | { kind: "home"; curriculum: boolean }
  | { kind: "lesson"; step: number };

function readLocationTarget(): LocationTarget {
  const lessonPath = window.location.pathname.match(/^\/lessons\/([^/]+)\/?$/);
  if (lessonPath) {
    const lessonIndex = getStepIndexBySlug(lessonPath[1]);
    if (lessonIndex >= 0) {
      return { kind: "lesson", step: lessonIndex };
    }
  }

  return {
    kind: "home",
    curriculum: /^\/lessons\/?$/.test(window.location.pathname),
  };
}

function getNavigationUrl(step: number): string {
  return step === HOME_STEP
    ? "/"
    : `/lessons/${STEPS[step].slug}`;
}

// Set the client in all three flow stores so placing it once carries
// across the Write, Read, and Consistency steps. Skips stores already at
// that position to avoid resetting a finished animation.
function setSharedClientLocation(lat: number, lon: number) {
  for (const store of [
    useWriteFlowStore,
    useReadFlowStore,
    useConsistencyRaceStore,
  ] as const) {
    const cur = store.getState().clientLocation;
    if (!cur || cur.lat !== lat || cur.lon !== lon) {
      store.getState().setClientLocation(lat, lon);
    }
  }
}

function resetLessonSimulations() {
  useWriteFlowStore.getState().reset();
  useReadFlowStore.getState().reset();
  useConsistencyRaceStore.getState().reset();
  useFailoverStore.getState().reset();
}

function OpeningMessageFlow({ city }: { city: string }) {
  const labels = ["client", "message", city];

  return (
    <div className="relative mx-auto mt-4 h-14 max-w-xs text-emerald-300">
      <div className="absolute left-7 right-7 top-2.5 h-px overflow-hidden bg-white/10">
        <span className="curriculum-signal-line block h-full origin-left bg-current" />
      </div>
      <div className="absolute inset-x-0 top-0 flex justify-between">
        {labels.map((label, index) => (
          <div
            key={label}
            className="flex w-20 flex-col items-center gap-2.5"
          >
            <span
              className="curriculum-signal-node block h-2.5 w-2.5 rounded-full bg-zinc-950 text-current shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_0_14px_currentColor]"
              style={{ animationDelay: `${index * 0.9}s` }}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel animation variants ─────────────────────────────────────────
const desktopLeftPanelVariants = {
  hidden: { transform: "translate3d(-400px, 0, 0)", opacity: 0 },
  visible: { transform: "translate3d(0px, 0, 0)", opacity: 1 },
  exit: { transform: "translate3d(-400px, 0, 0)", opacity: 0 },
};

const mobileLeftPanelVariants = {
  hidden: { transform: "translate3d(0, 40px, 0)", opacity: 0 },
  visible: { transform: "translate3d(0, 0px, 0)", opacity: 1 },
  exit: { transform: "translate3d(0, 40px, 0)", opacity: 0 },
};

const rightPanelVariants = {
  hidden: { transform: "translate3d(100px, 0, 0)", opacity: 0 },
  visible: { transform: "translate3d(0px, 0, 0)", opacity: 1 },
  exit: { transform: "translate3d(100px, 0, 0)", opacity: 0 },
};

const panelTransition = {
  type: "tween",
  duration: 0.22,
  ease: [0.23, 1, 0.32, 1],
} satisfies Transition;

interface DistributedConceptsAppProps {
  initialStep?: number;
  initialView?: "intro" | "curriculum";
}

export function DistributedConceptsApp({
  initialStep = HOME_STEP,
  initialView = "intro",
}: DistributedConceptsAppProps) {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [showCurriculum, setShowCurriculum] = useState(
    initialView === "curriculum"
  );
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [homeChapterId, setHomeChapterId] =
    useState<ChapterId>("foundations");
  const isLoaded = minTimeElapsed && globeReady;
  const isHome = activeStep === HOME_STEP;
  const isIntro = isHome && !showCurriculum;
  const isLanding = activeStep === 0;
  const activeLesson =
    activeStep >= 0 ? STEPS[activeStep] : STEPS[0];

  const navigateToStep = useCallback((step: number) => {
    if (step < HOME_STEP || step > LAST_STEP) return;
    setActiveStep(step);
    setShowCurriculum(false);
    if (step >= 0) setHomeChapterId(STEPS[step].chapterId);

    const url = getNavigationUrl(step);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (url !== currentUrl) window.history.pushState(null, "", url);
  }, []);

  const openCurriculum = useCallback(() => {
    setActiveStep(HOME_STEP);
    setShowCurriculum(true);

    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== "/lessons") {
      window.history.pushState(null, "", "/lessons");
    }
  }, []);

  const openFromCurriculum = useCallback(
    (step: number) => {
      if (step === 0) {
        useDatabaseStore.getState().reset();
        resetLessonSimulations();
      }
      navigateToStep(step);
    },
    [navigateToStep]
  );

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 800);
    return () => clearTimeout(t);
  }, []);

  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);
  }, []);

  // ── Mobile detection (matches Tailwind's md: breakpoint) ──────────
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ── Shareable step URLs ───────────────────────────────────────────
  useEffect(() => {
    const target = readLocationTarget();
    if (target.kind === "lesson") {
      // One-time sync from the URL after hydration; a lazy initializer would
      // mismatch the server-rendered curriculum markup
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveStep(target.step);
      setHomeChapterId(STEPS[target.step].chapterId);
    } else {
      setShowCurriculum(target.curriculum);
    }
  }, []);

  useEffect(() => {
    const restoreFromHistory = () => {
      const target = readLocationTarget();
      if (target.kind === "home") {
        setActiveStep(HOME_STEP);
        setShowCurriculum(target.curriculum);
        return;
      }

      setActiveStep(target.step);
      setHomeChapterId(STEPS[target.step].chapterId);
    };

    window.addEventListener("popstate", restoreFromHistory);
    return () => window.removeEventListener("popstate", restoreFromHistory);
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_CURRICULUM_EVENT, openCurriculum);
    return () =>
      window.removeEventListener(OPEN_CURRICULUM_EVENT, openCurriculum);
  }, [openCurriculum]);

  // ── Keyboard navigation (← / →) ───────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeStep !== HOME_STEP) {
        navigateToStep(HOME_STEP);
        return;
      }
      if (e.key === "Escape" && showCurriculum) {
        navigateToStep(HOME_STEP);
        return;
      }
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (isHome) return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest(
          "button, a, input, textarea, select, [contenteditable]"
        )
      )
        return;
      navigateToStep(
        e.key === "ArrowRight"
          ? Math.min(activeStep + 1, LAST_STEP)
          : Math.max(activeStep - 1, 0)
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeStep, isHome, navigateToStep, showCurriculum]);

  // ── Responsive Framer variants ────────────────────────────────────
  const leftPanelVariants = isMobile
    ? mobileLeftPanelVariants
    : desktopLeftPanelVariants;

  // ── Shared store state ──────────────────────────────────────────────
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const toggleRegion = useDatabaseStore((s) => s.toggleRegion);
  const geo = useGeolocation();
  const suggestedRegion = useMemo(() => {
    const location = geo ?? DEFAULT_CLIENT;
    return findNearestRegion(
      location.lat,
      location.lon,
      ALL_REGION_IDS
    )?.region;
  }, [geo]);

  // Every simulation is tied to one topology. Replacing the leader or replicas
  // invalidates completed phases, events, and client routes from the old one.
  useEffect(() => {
    resetLessonSimulations();
  }, [primaryRegion, readRegions]);

  // ── Step-specific setup ─────────────────────────────────────────────

  // Direct entry must prepare a valid same-provider topology without counting
  // that setup as learner progress.
  useEffect(() => {
    if (activeStep < 2) return;
    const database = useDatabaseStore.getState();
    const primaryId = database.primaryRegion ?? "us-east-1";
    if (!database.primaryRegion) database.setPrimary(primaryId);

    const latestDatabase = useDatabaseStore.getState();
    if (latestDatabase.readRegions.length > 0) return;

    const primary = getRegionById(primaryId);
    if (!primary) return;
    const replica =
      regions.find(
        (region) =>
          region.provider === primary.provider &&
          region.id !== primary.id &&
          region.continent !== primary.continent
      ) ??
      regions.find(
        (region) =>
          region.provider === primary.provider && region.id !== primary.id
      );

    if (replica) {
      latestDatabase.addReadRegion(replica.id);
    }
  }, [activeStep]);

  // Steps 2-4: auto-place the shared client (previous placement → geolocation
  // → fixed fallback) so Execute/Run Race are never dead on arrival
  useEffect(() => {
    if (activeStep < 2 || activeStep > 4) return;

    const existing =
      activeStep === 4
        ? useConsistencyRaceStore.getState().clientLocation ??
          useReadFlowStore.getState().clientLocation ??
          useWriteFlowStore.getState().clientLocation
        : useWriteFlowStore.getState().clientLocation ??
          useReadFlowStore.getState().clientLocation ??
          useConsistencyRaceStore.getState().clientLocation;

    // These lessons begin with a reader near a replica so their advertised
    // routing and stale-read behavior is ready without extra globe hunting.
    if (
      (activeStep === 3 || activeStep === 4) &&
      readRegions.length > 0
    ) {
      const replica = getRegionById(readRegions[0]);
      if (replica) {
        setSharedClientLocation(replica.lat, replica.lon);
        return;
      }
    }

    const loc = existing ?? geo ?? DEFAULT_CLIENT;
    setSharedClientLocation(loc.lat, loc.lon);
  }, [activeStep, geo, readRegions]);

  // ── Region click handler (step-dependent) ───────────────────────────
  const handleRegionClick = useCallback(
    (region: Region) => {
      if (activeStep === 0) {
        playSelectSound();
        const database = useDatabaseStore.getState();
        database.reset();
        database.setPrimary(region.id);
        useOnboardingStore
          .getState()
          .markStepComplete("distributed-service");
        return;
      }
      if (activeStep === 1) {
        playRegionToggleSound(
          region.id === primaryRegion || readRegions.includes(region.id),
          primaryRegion !== null
        );
        toggleRegion(region.id);
      } else if (activeStep >= 2 && activeStep <= 4) {
        playSelectSound();
        setSharedClientLocation(region.lat, region.lon);
      }
    },
    [activeStep, primaryRegion, readRegions, toggleRegion]
  );

  const startWithSuggestedRegion = useCallback(() => {
    if (!suggestedRegion) return;
    playSelectSound();
    const database = useDatabaseStore.getState();
    database.reset();
    database.setPrimary(suggestedRegion.id);
    useOnboardingStore
      .getState()
      .markStepComplete("distributed-service");
  }, [suggestedRegion]);

  const restartJourney = useCallback(() => {
    useDatabaseStore.getState().reset();
    resetLessonSimulations();
    navigateToStep(HOME_STEP);
  }, [navigateToStep]);

  // ── Globe click handler (steps 2-4) ─────────────────────────────────
  const handleGlobeClick = useCallback(
    (lat: number, lon: number) => {
      if (activeStep >= 2 && activeStep <= 4) {
        playSelectSound();
        setSharedClientLocation(lat, lon);
      }
    },
    [activeStep]
  );

  // ── Consistency: nearest region computation ─────────────────────────
  const consistencyClientLocation = useConsistencyRaceStore(
    (s) => s.clientLocation
  );

  const allRegionIds = useMemo(
    () => (primaryRegion ? [primaryRegion, ...readRegions] : []),
    [primaryRegion, readRegions]
  );

  const nearest = useMemo(() => {
    if (activeStep !== 4 || !consistencyClientLocation) return null;
    return findNearestRegion(
      consistencyClientLocation.lat,
      consistencyClientLocation.lon,
      allRegionIds
    );
  }, [activeStep, consistencyClientLocation, allRegionIds]);

  const nearestIsPrimary = nearest?.region.id === primaryRegion;
  const replicaRegionId =
    nearest && !nearestIsPrimary ? nearest.region.id : null;

  // ── Failover: effective primary + camera target ─────────────────────
  const failoverPhase = useFailoverStore((s) => s.phase);
  const newPrimaryId = useFailoverStore((s) => s.newPrimaryId);

  const effectivePrimary = useMemo(() => {
    if (activeStep !== 5) return primaryRegion;
    if (failoverPhase === "idle") return primaryRegion;
    if (
      failoverPhase === "elected" ||
      failoverPhase === "recovering" ||
      failoverPhase === "complete"
    )
      return newPrimaryId;
    return null;
  }, [activeStep, failoverPhase, primaryRegion, newPrimaryId]);

  const cameraTarget = useMemo(() => {
    if (activeStep !== 5) return undefined;
    if (failoverPhase === "complete") return null;
    if (
      failoverPhase === "electing" ||
      failoverPhase === "elected" ||
      failoverPhase === "recovering"
    ) {
      if (newPrimaryId) {
        const r = getRegionById(newPrimaryId);
        if (r) return { lat: r.lat, lon: r.lon };
      }
    }
    if (primaryRegion) {
      const r = getRegionById(primaryRegion);
      if (r) return { lat: r.lat, lon: r.lon };
    }
    return null;
  }, [activeStep, failoverPhase, primaryRegion, newPrimaryId]);

  // ── Step completion tracking (drives nav checkmarks) ────────────────
  const writePhase = useWriteFlowStore((s) => s.phase);
  const readPhase = useReadFlowStore((s) => s.phase);
  const racePhase = useConsistencyRaceStore((s) => s.phase);
  const markStepComplete = useOnboardingStore((s) => s.markStepComplete);

  useEffect(() => {
    if (
      activeStep === 1 &&
      primaryRegion &&
      readRegions.length > 0
    ) {
      markStepComplete("replication");
    }
    if (activeStep === 2 && writePhase === "complete") {
      markStepComplete("write-path");
    }
    if (activeStep === 3 && readPhase === "complete") {
      markStepComplete("replica-read");
    }
    if (
      activeStep === 4 &&
      (racePhase === "result" || racePhase === "complete")
    ) {
      markStepComplete("stale-read");
    }
    if (activeStep === 5 && failoverPhase === "complete") {
      markStepComplete("recovery");
    }
  }, [
    activeStep,
    primaryRegion,
    readRegions,
    writePhase,
    readPhase,
    racePhase,
    failoverPhase,
    markStepComplete,
  ]);

  const isCurrentStepComplete =
    isHome
      ? false
      : activeStep === 0
      ? primaryRegion !== null
      : activeStep === 1
        ? primaryRegion !== null && readRegions.length > 0
        : activeStep === 2
          ? writePhase === "complete"
          : activeStep === 3
            ? readPhase === "complete"
            : activeStep === 4
              ? racePhase === "result" || racePhase === "complete"
              : failoverPhase === "complete";

  // ── Derive GlobeScene props per step ────────────────────────────────
  const globePrimaryRegion =
    activeStep === 5 ? effectivePrimary : primaryRegion;

  // ── Per-step view table ─────────────────────────────────────────────
  // One row per step: globe overlays, panels, and globe behavior flags.
  // Step metadata (titles, hints) lives in lib/steps.ts.
  const stepViews = [
    // 0 — Globe Explorer
    {
      viz: null,
      left: null,
      right: null,
      regionsClickable: true,
      clientPlaceable: false,
      showUserDbConnection: false,
      hideUserLocation: false,
    },
    // 1 — Region Builder
    {
      viz: (
        <>
          <LatencyHeatmap />
          <ConnectionArcs />
        </>
      ),
      left: (
        <RegionBuilder
          suggestedRegionId={suggestedRegion?.id}
          onNext={() => navigateToStep(2)}
        />
      ),
      right: <LatencyStats />,
      regionsClickable: true,
      clientPlaceable: false,
      showUserDbConnection: true,
      hideUserLocation: false,
    },
    // 2 — Write Flow
    {
      viz: (
        <>
          <ConnectionArcs />
          <WriteFlowVisualization />
        </>
      ),
      left: <WritePanel onNext={() => navigateToStep(3)} />,
      right: isMobile ? null : <EventTimeline />,
      regionsClickable: true,
      clientPlaceable: true,
      showUserDbConnection: false,
      hideUserLocation: true,
    },
    // 3 — Read Flow
    {
      viz: (
        <>
          <ConnectionArcs />
          <LatencyHeatmap />
          <ReadFlowVisualization />
        </>
      ),
      left: <ReadPanel onNext={() => navigateToStep(4)} />,
      right: <LatencyComparison />,
      regionsClickable: true,
      clientPlaceable: true,
      showUserDbConnection: true,
      hideUserLocation: false,
    },
    // 4 — Consistency Race
    {
      viz: (
        <>
          <ConnectionArcs />
          {replicaRegionId ? (
            <ConsistencyRaceVisualization replicaRegionId={replicaRegionId} />
          ) : (
            /* Client marker when nearest is primary (no race visualization) */
            consistencyClientLocation && (
              <ClientMarker
                lat={consistencyClientLocation.lat}
                lon={consistencyClientLocation.lon}
              />
            )
          )}
        </>
      ),
      left: (
        <ConsistencyRacePanel
          replicaRegionId={replicaRegionId}
          nearestIsPrimary={nearestIsPrimary}
          onNext={() => navigateToStep(5)}
        />
      ),
      right: null,
      regionsClickable: true,
      clientPlaceable: true,
      showUserDbConnection: false,
      hideUserLocation: false,
    },
    // 5 — Failover
    {
      viz: (
        <>
          {failoverPhase === "idle" && <ConnectionArcs />}
          <FailoverVisualization />
        </>
      ),
      left: <FailoverPanel onRestart={restartJourney} />,
      right: <FailoverTimeline />,
      regionsClickable: false,
      clientPlaceable: false,
      showUserDbConnection: false,
      hideUserLocation: false,
    },
  ];
  const homeView = {
    viz: null,
    left: null,
    right: null,
    regionsClickable: false,
    clientPlaceable: false,
    showUserDbConnection: false,
    hideUserLocation: false,
  };
  const view = isHome ? homeView : stepViews[activeStep];
  const hasRightPanel = view.right !== null && !isLanding && !isHome;
  const placedPrimary = primaryRegion
    ? getRegionById(primaryRegion)
    : null;

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Full-screen globe — stays mounted across ALL modes */}
      <div
        className={`absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.77,0,0.175,1)] ${
          isHome || isLanding
            ? "translate-x-0"
            : "-translate-y-[28vh] md:translate-y-0 md:translate-x-[205px]"
        }`}
      >
        <GlobeScene
          isMobile={isMobile}
          onReady={handleGlobeReady}
          onRegionClick={view.regionsClickable ? handleRegionClick : undefined}
          onGlobeClick={view.clientPlaceable ? handleGlobeClick : undefined}
          selectedRegions={isHome || isLanding ? [] : readRegions}
          primaryRegion={isHome ? null : globePrimaryRegion}
          showUserDbConnection={view.showUserDbConnection}
          hideUserLocation={view.hideUserLocation}
          cameraTarget={isHome || isLanding ? undefined : cameraTarget}
          focusSelectedRegions={!isHome && !isLanding && activeStep >= 2}
        >
          {view.viz}
        </GlobeScene>
      </div>

      {/* Gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 md:h-72 bg-linear-to-b from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 md:h-72 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

      {/* ═══ Curriculum home ═══ */}
      <AnimatePresence initial={false}>
        {isHome && showCurriculum ? (
          <CurriculumHome
            key="curriculum-home"
            activeChapterId={homeChapterId}
            onChapterChange={setHomeChapterId}
            onStart={() => openFromCurriculum(0)}
            onSelectLesson={openFromCurriculum}
          />
        ) : null}
      </AnimatePresence>

      {/* ═══ Quiet first-open home ═══ */}
      <AnimatePresence initial={false}>
        {isIntro ? (
          <HomeIntro
            key="home-intro"
            onBrowse={openCurriculum}
            onStart={() => openFromCurriculum(0)}
          />
        ) : null}
      </AnimatePresence>

      {/* ═══ Opening lesson UI (step 0) ═══ */}
      <AnimatePresence>
        {isLanding && (
          <motion.div
            key="landing-header"
            initial={{
              opacity: 0,
              transform: "translate3d(0, -12px, 0)",
            }}
            animate={{
              opacity: 1,
              transform: "translate3d(0, 0, 0)",
            }}
            exit={{
              opacity: 0,
              transform: "translate3d(0, -8px, 0)",
            }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-20 md:pt-8"
          >
            <div className="pointer-events-auto w-full max-w-md rounded-3xl bg-[var(--surface-panel)] px-5 py-4 text-center shadow-[0_0_0_1px_var(--line-subtle),0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-7 sm:py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                {placedPrimary ? "Node placed" : `Lesson 1 of ${STEPS.length}`}
              </p>
              <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                {placedPrimary
                  ? `${placedPrimary.city} accepts writes`
                  : "Build a distributed service"}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-pretty text-xs leading-relaxed text-zinc-400 sm:text-sm">
                {placedPrimary
                  ? "A client sends a request as a message. This node receives it, orders the write, and changes its own local state."
                  : "A node is one independently running member of the system. Choose the node that will accept and order writes."}
              </p>
              {placedPrimary ? (
                <>
                  <OpeningMessageFlow city={placedPrimary.city} />
                  <button
                    onClick={() => navigateToStep(1)}
                    className="mt-3 min-h-11 rounded-full bg-emerald-400 pl-5 pr-[18px] text-sm font-semibold text-zinc-950 transition-[background-color,scale] duration-150 hover:bg-emerald-300 active:scale-[0.96]"
                  >
                    Add a replica
                    <span className="ml-2 opacity-70" aria-hidden="true">
                      →
                    </span>
                  </button>
                </>
              ) : suggestedRegion ? (
                <button
                  onClick={startWithSuggestedRegion}
                  className="mt-4 min-h-11 rounded-full bg-emerald-400 pl-5 pr-4 text-sm font-semibold text-zinc-950 transition-[background-color,scale] duration-150 hover:bg-emerald-300 active:scale-[0.96]"
                >
                  Place the first node in {suggestedRegion.city}
                  <span className="ml-2" aria-hidden="true">
                    →
                  </span>
                </button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Learn UI (steps 1-5) ═══ */}

      {/* Left panel — desktop: sidebar from left, mobile: split-screen bottom half */}
      {/* Sync mode (no mode="wait"): waiting for exit can drop the incoming
          panel entirely when steps change rapidly (arrow keys) */}
      <AnimatePresence>
        {!isHome && !isLanding && (
          <motion.div
            key={`left-${activeStep}`}
            variants={leftPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
            className="z-20 fixed top-[38dvh] bottom-0 left-0 right-0 flex flex-col rounded-t-3xl border-t border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] shadow-[0_-18px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl md:absolute md:top-0 md:bottom-0 md:left-0 md:right-auto md:w-[410px] md:rounded-none md:border-0 md:bg-transparent md:shadow-none md:backdrop-blur-none md:p-4"
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden" aria-hidden="true" />
            {/* Panel content — scrollable on mobile */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2 md:h-full md:p-0">
              {view.left}

              {/* Mobile-only: right panel content stacked below left panel */}
              {hasRightPanel && (
                <div className="md:hidden mt-3">{view.right}</div>
              )}
            </div>

            {/* Mobile bottom bar: back + current lesson + next */}
            <div className="grid shrink-0 grid-cols-[44px_1fr_44px] items-center gap-2 border-t border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] px-2 py-2 pb-safe md:hidden">
              {/* Back button */}
              <button
                onClick={() => navigateToStep(Math.max(activeStep - 1, 0))}
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition-[border-color,color,scale] duration-150 hover:border-emerald-500/50 hover:text-emerald-400 active:scale-[0.96] ${
                  activeStep <= 0 ? "opacity-30 pointer-events-none" : ""
                }`}
                aria-label="Previous step"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="min-w-0 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  Step {activeStep + 1} of {STEPS.length}
                </p>
                <p className="truncate text-xs font-medium text-zinc-300">
                  {activeLesson.title}
                </p>
              </div>

              {/* Next stays available for free exploration, then brightens on completion. */}
              <button
                onClick={() =>
                  activeStep >= LAST_STEP
                    ? restartJourney()
                    : navigateToStep(Math.min(activeStep + 1, LAST_STEP))
                }
                disabled={activeStep >= LAST_STEP && !isCurrentStepComplete}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-[background-color,border-color,color,scale] duration-150 active:not-disabled:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30 ${
                  isCurrentStepComplete
                    ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                    : "border-zinc-800 bg-zinc-900/80 text-zinc-400"
                }`}
                aria-label={
                  activeStep >= LAST_STEP
                    ? "Return to curriculum"
                    : `Next: ${activeLesson.nextAction}`
                }
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-right panel — desktop only, slides in from right */}
      <AnimatePresence>
        {hasRightPanel && (
          <motion.div
            key={`right-${activeStep}`}
            variants={rightPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
            className="hidden md:block absolute top-14 right-4 z-20 w-[320px]"
          >
            {view.right}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom: Learning Path Nav — desktop only */}
      {!isHome && (
        <div
          className={`hidden md:flex absolute right-0 z-20 flex-col items-center gap-3 pb-6 transition-[left] duration-500 ease-in-out left-0 ${
          isLanding
            ? "bottom-0"
            : "bottom-0 md:left-[410px]"
        }`}
        >
          <LearningPathNav
            activeStep={activeStep}
            onStepChange={navigateToStep}
          />
          <p className="text-xs text-zinc-400">{activeLesson.hint}</p>
        </div>
      )}

      {/* Mobile: Landing nav (step 0 only, since steps 1-5 have nav in panel) */}
      {isLanding && (
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 pb-4">
          <LearningPathNav
            activeStep={activeStep}
            onStepChange={navigateToStep}
          />
        </div>
      )}

      {/* Back step button — desktop only */}
      {!isHome && !isLanding && activeStep > 0 && (
        <button
          onClick={() => navigateToStep(Math.max(activeStep - 1, 0))}
          className="fixed left-[426px] top-1/2 z-30 hidden -translate-y-1/2 cursor-pointer items-center gap-2 rounded-full border border-[var(--line-subtle)] bg-[var(--surface-panel)] px-4 py-2.5 text-sm text-zinc-400 backdrop-blur-sm transition-[border-color,color] duration-150 hover:border-emerald-500/50 hover:text-emerald-400 md:flex"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back</span>
        </button>
      )}

      {/* Loading screen (shown until globe textures load) */}
      <AnimatePresence>{!isLoaded && <LoadingScreen />}</AnimatePresence>

    </div>
  );
}

export default function Home() {
  return <DistributedConceptsApp />;
}
