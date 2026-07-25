"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { STEPS, LAST_STEP } from "@/lib/steps";
import { playSelectSound, playRegionToggleSound } from "@/lib/sounds";

// Fallback client position when geolocation is unavailable (Istanbul \u2014
// deliberately not an existing region, so routing stays interesting)
const DEFAULT_CLIENT = { lat: 41.0, lon: 28.98 };
const ALL_REGION_IDS = regions.map((region) => region.id);

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

// ── Panel animation variants ─────────────────────────────────────────
const desktopLeftPanelVariants = {
  hidden: { x: -400, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: -400, opacity: 0 },
};

const mobileLeftPanelVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: 40, opacity: 0 },
};

const rightPanelVariants = {
  hidden: { x: 100, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 },
};

const panelTransition = {
  type: "tween" as const,
  duration: 0.22,
  ease: [0.23, 1, 0.32, 1] as const,
};

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isLoaded = minTimeElapsed && globeReady;
  const isLanding = activeStep === 0;

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 800);
    return () => clearTimeout(t);
  }, []);

  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);
  }, []);

  const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);

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
    const step = Number(new URLSearchParams(window.location.search).get("step"));
    if (Number.isInteger(step) && step >= 1 && step <= LAST_STEP)
      // One-time sync from the URL after hydration; a lazy initializer would
      // mismatch the server-rendered step-0 markup
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveStep(step);
  }, []);

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      activeStep === 0 ? window.location.pathname : `?step=${activeStep}`
    );
  }, [activeStep]);

  // ── Keyboard navigation (← / →) ───────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input, textarea, select, [contenteditable]")
      )
        return;
      setActiveStep((s) =>
        e.key === "ArrowRight" ? Math.min(s + 1, LAST_STEP) : Math.max(s - 1, 0)
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  // ── Step-specific setup ─────────────────────────────────────────────

  // Steps 2-5: ensure default regions exist
  useEffect(() => {
    if (activeStep < 2) return;
    const { primaryRegion, setPrimary, addReadRegion } =
      useDatabaseStore.getState();
    if (!primaryRegion) {
      setPrimary("us-east-1");
      addReadRegion("eu-west-1");
      addReadRegion("ap-southeast-1");
      if (activeStep === 5) addReadRegion("ap-northeast-1");
    }
  }, [activeStep]);

  // Steps 2-4: auto-place the shared client (previous placement → geolocation
  // → fixed fallback) so Execute/Run Race are never dead on arrival
  useEffect(() => {
    if (activeStep < 2 || activeStep > 4) return;
    const existing =
      useWriteFlowStore.getState().clientLocation ??
      useReadFlowStore.getState().clientLocation ??
      useConsistencyRaceStore.getState().clientLocation;
    const loc = existing ?? geo ?? DEFAULT_CLIENT;
    setSharedClientLocation(loc.lat, loc.lon);
  }, [activeStep, geo]);

  // ── Region click handler (step-dependent) ───────────────────────────
  const handleRegionClick = useCallback(
    (region: Region) => {
      if (activeStep === 0) {
        // Landing: choose a clean primary, then enter the region builder.
        playSelectSound();
        const database = useDatabaseStore.getState();
        database.reset();
        database.setPrimary(region.id);
        setActiveStep(1);
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
    setActiveStep(1);
  }, [suggestedRegion]);

  const restartJourney = useCallback(() => {
    useFailoverStore.getState().reset();
    useDatabaseStore.getState().reset();
    useWriteFlowStore.getState().reset();
    useReadFlowStore.getState().reset();
    useConsistencyRaceStore.getState().reset();
    useOnboardingStore.getState().resetProgress();
    setActiveStep(0);
  }, []);

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
    if (activeStep > 0) markStepComplete(0);
    if (primaryRegion && readRegions.length > 0) markStepComplete(1);
    if (writePhase === "complete") markStepComplete(2);
    if (readPhase === "complete") markStepComplete(3);
    if (racePhase === "result" || racePhase === "complete")
      markStepComplete(4);
    if (failoverPhase === "complete") markStepComplete(5);
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
    activeStep === 0
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
          onNext={() => setActiveStep(2)}
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
      left: <WritePanel onNext={() => setActiveStep(3)} />,
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
      left: <ReadPanel onNext={() => setActiveStep(4)} />,
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
          onNext={() => setActiveStep(5)}
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
  const view = stepViews[activeStep];
  const hasRightPanel = view.right !== null && !isLanding;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Full-screen globe — stays mounted across ALL modes */}
      <div
        className={`absolute inset-0 transition-transform duration-700 ease-in-out ${
          isLanding ? "translate-x-0" : "-translate-y-[20vh] md:translate-y-0 md:translate-x-[190px]"
        }`}
      >
        <GlobeScene
          isMobile={isMobile}
          onReady={handleGlobeReady}
          onRegionClick={view.regionsClickable ? handleRegionClick : undefined}
          onGlobeClick={view.clientPlaceable ? handleGlobeClick : undefined}
          selectedRegions={isLanding ? [] : readRegions}
          primaryRegion={isLanding ? null : globePrimaryRegion}
          showUserDbConnection={view.showUserDbConnection}
          hideUserLocation={view.hideUserLocation}
          cameraTarget={isLanding ? undefined : cameraTarget}
        >
          {view.viz}
        </GlobeScene>
      </div>

      {/* Gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 md:h-72 bg-linear-to-b from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 md:h-72 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

      {/* ═══ Landing UI (step 0) ═══ */}
      <AnimatePresence>
        {isLanding && hasSeenWelcome && isLoaded && (
          <motion.div
            key="landing-header"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-20 md:pt-8"
          >
            <div className="pointer-events-auto w-full max-w-md rounded-3xl bg-zinc-950/82 px-5 py-4 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-7 sm:py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Your first task
              </p>
              <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                Choose your primary region
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-pretty text-xs leading-relaxed text-zinc-400 sm:text-sm">
                Every write starts here. Pick any glowing region, or begin with
                the closest suggested location.
              </p>
              {suggestedRegion && (
                <button
                  onClick={startWithSuggestedRegion}
                  className="mt-4 min-h-11 rounded-full bg-emerald-400 pl-5 pr-4 text-sm font-semibold text-zinc-950 transition-[background-color,scale] duration-150 hover:bg-emerald-300 active:scale-[0.96]"
                >
                  Use {suggestedRegion.city}
                  <span className="ml-2" aria-hidden="true">
                    →
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Learn UI (steps 1-5) ═══ */}

      {/* Left panel — desktop: sidebar from left, mobile: split-screen bottom half */}
      {/* Sync mode (no mode="wait"): waiting for exit can drop the incoming
          panel entirely when steps change rapidly (arrow keys) */}
      <AnimatePresence>
        {!isLanding && (
          <motion.div
            key={`left-${activeStep}`}
            variants={leftPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
            className="z-20 fixed top-[50vh] bottom-0 left-0 right-0 flex flex-col rounded-t-2xl border-t border-zinc-800/50 bg-zinc-950/95 backdrop-blur-md md:absolute md:top-0 md:bottom-0 md:left-0 md:right-auto md:w-[380px] md:rounded-none md:border-0 md:bg-transparent md:backdrop-blur-none md:p-4"
          >
            {/* Panel content — scrollable on mobile */}
            <div className="flex-1 overflow-y-auto p-4 md:p-0 md:h-full min-h-0">
              {view.left}

              {/* Mobile-only: right panel content stacked below left panel */}
              {hasRightPanel && (
                <div className="md:hidden mt-3">{view.right}</div>
              )}
            </div>

            {/* Mobile bottom bar: back + current lesson + next */}
            <div className="md:hidden shrink-0 grid grid-cols-[44px_1fr_44px] items-center gap-2 px-2 py-2 border-t border-zinc-800/50 pb-safe">
              {/* Back button */}
              <button
                onClick={() => setActiveStep((s) => Math.max(s - 1, 0))}
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
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Step {activeStep + 1} of {STEPS.length}
                </p>
                <p className="truncate text-xs font-medium text-zinc-300">
                  {STEPS[activeStep].title}
                </p>
              </div>

              {/* Next stays available for free exploration, then brightens on completion. */}
              <button
                onClick={() =>
                  activeStep >= LAST_STEP
                    ? restartJourney()
                    : setActiveStep((s) => Math.min(s + 1, LAST_STEP))
                }
                disabled={activeStep >= LAST_STEP && !isCurrentStepComplete}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-[background-color,border-color,color,scale] duration-150 active:not-disabled:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30 ${
                  isCurrentStepComplete
                    ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                    : "border-zinc-800 bg-zinc-900/80 text-zinc-400"
                }`}
                aria-label={
                  activeStep >= LAST_STEP
                    ? "Start over"
                    : `Next: ${STEPS[activeStep].nextAction}`
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
      <div
        className={`hidden md:flex absolute right-0 z-20 flex-col items-center gap-3 pb-6 transition-[left] duration-500 ease-in-out left-0 ${
          isLanding
            ? "bottom-0"
            : "bottom-0 md:left-[380px]"
        }`}
      >
        <LearningPathNav
          activeStep={activeStep}
          onStepChange={setActiveStep}
        />
        <p className="text-xs text-zinc-400">{STEPS[activeStep].hint}</p>
      </div>

      {/* Mobile: Landing nav (step 0 only, since steps 1-5 have nav in panel) */}
      {isLanding && (
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 pb-4">
          <LearningPathNav
            activeStep={activeStep}
            onStepChange={setActiveStep}
          />
        </div>
      )}

      {/* Back step button — desktop only */}
      {!isLanding && activeStep > 0 && (
        <button
          onClick={() => setActiveStep((s) => Math.max(s - 1, 0))}
          className="hidden md:flex fixed left-[396px] top-1/2 z-30 -translate-y-1/2 cursor-pointer items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-400 backdrop-blur-sm transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
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
