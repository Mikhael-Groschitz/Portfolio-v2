"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { PROFILE_ATTRIBUTE } from "@/components/connect/connection-runtime";
import { useConnectionStatus } from "@/components/connect/use-connection-status";
import { WIDE_MEDIA_QUERY } from "@/components/shell/breakpoints";
import {
  defaultCheatsheet,
  setPlacement,
} from "@/components/shell/layout-model";
import { readLayout, updateLayout } from "@/components/shell/layout-store";
import {
  concealWindow,
  revealWindow,
} from "@/components/shell/tool-window-actions";
import { useMediaQuery } from "@/components/shell/use-media-query";
import { useWorkspace } from "@/components/shell/workspace-context";
import { type Profile, isProfile } from "@/content/profiles";
import type { TourStepId } from "@/content/types";
import {
  type SessionFlag,
  clearFlag,
  readFlag,
  setFlag,
  subscribeToFlags,
} from "./session-flags";

export const TOUR_STEPS: readonly TourStepId[] = [
  "query",
  "tables",
  "cheatsheet",
];
export const CHEATSHEET_ID = "cheatsheet";
export const CHEATSHEET_WINDOW_ID = "cheatsheet-window";

const TOUR_DELAY_MS = 400;

interface GuideContextValue {
  docked: boolean;
  sheetOpen: boolean;
  openCheatsheet: () => void;
  closeCheatsheet: () => void;
  chooseCheatsheet: () => void;
  tourIndex: number | null;
  startTour: () => void;
  nextTourStep: () => void;
  finishTour: () => void;
  pulse: boolean;
  stepDone: (step: TourStepId) => void;
  afterConnect: (profile: Profile) => void;
  resetCheatsheet: () => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

function useSessionFlag(flag: SessionFlag, onServer: boolean): boolean {
  return useSyncExternalStore(
    subscribeToFlags,
    () => readFlag(flag),
    () => onServer,
  );
}

function activeElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
}

function focusSelector(selector: string, options?: FocusOptions) {
  document.querySelector<HTMLElement>(selector)?.focus(options);
}

function focusLater(selector: string) {
  requestAnimationFrame(() => focusSelector(selector));
}

function profileOnPage(): Profile {
  const profile = document.documentElement.getAttribute(PROFILE_ATTRIBUTE);
  return isProfile(profile) ? profile : "visitor";
}

function placeByProfile(profile: Profile) {
  updateLayout((layout) =>
    setPlacement(layout, "cheatsheet", defaultCheatsheet(profile)),
  );
}

const FIRST_ITEM = `#${CHEATSHEET_ID} [data-cheatsheet-item]`;

export function GuideProvider({ children }: Readonly<{ children: ReactNode }>) {
  const docked = useMediaQuery(WIDE_MEDIA_QUERY);
  const connected = useConnectionStatus() === "connected";
  const { activeDocument } = useWorkspace();
  const started = useSessionFlag("workspace-started", true);
  const tourDue = useSessionFlag("tour-due", false);
  const [sheetRequested, setSheetRequested] = useState(false);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const sheetReturnFocus = useRef<HTMLElement | null>(null);
  const tourReturnFocus = useRef<HTMLElement | null>(null);
  const sheetOpen = !docked && sheetRequested;

  useEffect(() => {
    if (activeDocument !== null) {
      setFlag("workspace-started");
    }
  }, [activeDocument]);

  const chooseCheatsheet = useCallback(() => {
    setFlag("cheatsheet-placed");
  }, []);

  const openCheatsheet = useCallback(() => {
    if (docked) {
      if (readLayout().cheatsheet.hidden) {
        chooseCheatsheet();
      }
      revealWindow("cheatsheet", () =>
        focusSelector(FIRST_ITEM, { preventScroll: true }),
      );
      return;
    }
    sheetReturnFocus.current = activeElement();
    setSheetRequested(true);
    focusLater(FIRST_ITEM);
  }, [chooseCheatsheet, docked]);

  const closeCheatsheet = useCallback(() => {
    if (docked) {
      chooseCheatsheet();
      concealWindow("cheatsheet");
    } else {
      setSheetRequested(false);
      sheetReturnFocus.current?.focus();
    }
  }, [chooseCheatsheet, docked]);

  const startTour = useCallback(() => {
    setFlag("tour-seen");
    clearFlag("tour-due");
    setSheetRequested(false);
    tourReturnFocus.current = activeElement();
    setTourIndex(0);
  }, []);

  useEffect(() => {
    if (!connected || !tourDue) {
      return;
    }
    const timer = window.setTimeout(() => startTour(), TOUR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [connected, tourDue, startTour]);

  const finishTour = useCallback(() => {
    setTourIndex(null);
    const target = tourReturnFocus.current;
    if (target?.isConnected) {
      target.focus();
    } else {
      document
        .querySelector<HTMLElement>('[role="menubar"] [tabindex="0"]')
        ?.focus();
    }
  }, []);

  const nextTourStep = useCallback(() => {
    if (tourIndex === null || tourIndex >= TOUR_STEPS.length - 1) {
      finishTour();
    } else {
      setTourIndex(tourIndex + 1);
    }
  }, [finishTour, tourIndex]);

  const stepDone = useCallback((step: TourStepId) => {
    setFlag("workspace-started");
    const position = TOUR_STEPS.indexOf(step);
    setTourIndex((index) =>
      index === position && position < TOUR_STEPS.length - 1
        ? index + 1
        : index,
    );
  }, []);

  const afterConnect = useCallback((profile: Profile) => {
    if (!readFlag("cheatsheet-placed")) {
      placeByProfile(profile);
    }
    if (profile === "visitor" && !readFlag("tour-seen")) {
      setFlag("tour-due");
    }
  }, []);

  const resetCheatsheet = useCallback(() => {
    clearFlag("cheatsheet-placed");
    placeByProfile(profileOnPage());
    setSheetRequested(false);
  }, []);

  const value = useMemo(
    () => ({
      docked,
      sheetOpen,
      openCheatsheet,
      closeCheatsheet,
      chooseCheatsheet,
      tourIndex,
      startTour,
      nextTourStep,
      finishTour,
      pulse:
        connected && !started && activeDocument === null && tourIndex === null,
      stepDone,
      afterConnect,
      resetCheatsheet,
    }),
    [
      docked,
      sheetOpen,
      openCheatsheet,
      closeCheatsheet,
      chooseCheatsheet,
      tourIndex,
      startTour,
      nextTourStep,
      finishTour,
      connected,
      started,
      activeDocument,
      stepDone,
      afterConnect,
      resetCheatsheet,
    ],
  );

  return <GuideContext value={value}>{children}</GuideContext>;
}

export function useGuide(): GuideContextValue {
  const value = useContext(GuideContext);
  if (!value) {
    throw new Error("useGuide must be used inside GuideProvider");
  }
  return value;
}
