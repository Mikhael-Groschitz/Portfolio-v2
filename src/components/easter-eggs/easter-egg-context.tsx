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
} from "react";
import { readConnectionStatus } from "@/components/connect/connection-runtime";
import {
  type QueryDocumentId,
  isQueryDocument,
} from "@/components/shell/section-routes";
import { prefersReducedMotion } from "@/components/preferences/preferences-runtime";
import { useWorkspace } from "@/components/shell/workspace-context";
import { V1_DATABASE } from "@/engine/catalog";
import { KONAMI_CODE, LETTERS_FROM, nextKonamiStep } from "./konami";
import { startLanding } from "./landing-store";
import { markDeparture, takeArrival } from "./time-travel-runtime";
import { V1_URL } from "./v1-url";

const TRAVEL_COMMAND = `USE ${V1_DATABASE};`;

const TYPING_INTERVAL_MS = 45;
const DEPARTURE_MS = 2000;
const STILL_DEPARTURE_MS = 1000;
const REGENERATION_MS = 3000;

interface EasterEggValue {
  traveling: boolean;
  regenerating: boolean;
  playing: boolean;
  boardTardis: () => void;
  exitGame: () => void;
}

const EasterEggContext = createContext<EasterEggValue | null>(null);

export function EasterEggProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const {
    activeDocument,
    effect,
    queryStore,
    openQuery,
    runDocument,
    requestConnection,
    arrive,
  } = useWorkspace();
  const [landedId, setLandedId] = useState<number | null>(null);
  const [settledId, setSettledId] = useState<number | null>(null);
  const [closedGameId, setClosedGameId] = useState<number | null>(null);
  const [konamiGame, setKonamiGame] = useState(false);
  const traveling = effect?.kind === "travel" && effect.id !== landedId;
  const regenerating = effect?.kind === "regenerate" && effect.id !== settledId;
  const playing =
    konamiGame || (effect?.kind === "game" && effect.id !== closedGameId);
  const awaitingQuery = useRef(false);
  const typing = useRef(false);
  const timers = useRef(new Set<number>());

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  useEffect(() => {
    if (!traveling || V1_URL === null) {
      return;
    }
    const destination = V1_URL;
    const timer = window.setTimeout(
      () => {
        markDeparture();
        window.location.assign(destination);
      },
      prefersReducedMotion() ? STILL_DEPARTURE_MS : DEPARTURE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [traveling]);

  useEffect(() => {
    if (!regenerating || !effect) {
      return;
    }
    const { id } = effect;
    const timer = window.setTimeout(() => setSettledId(id), REGENERATION_MS);
    return () => window.clearTimeout(timer);
  }, [regenerating, effect]);

  const land = useCallback(() => {
    arrive();
    if (!prefersReducedMotion()) {
      startLanding();
    }
  }, [arrive]);

  useEffect(() => {
    if (takeArrival()) {
      land();
    }
  }, [land]);

  useEffect(() => {
    function landOnReturn(event: PageTransitionEvent) {
      if (event.persisted && traveling && effect) {
        takeArrival();
        setLandedId(effect.id);
        land();
      }
    }
    window.addEventListener("pageshow", landOnReturn);
    return () => window.removeEventListener("pageshow", landOnReturn);
  }, [land, effect, traveling]);

  const typeCommand = useCallback(
    (document: QueryDocumentId) => {
      const query = queryStore(document);
      typing.current = true;
      query.requestFocus();
      const base = query.getSnapshot().text.trimEnd();
      const prefix = base ? `${base}\n` : "";
      const start = prefix.length;
      const launch = () => {
        query.update({
          text: prefix + TRAVEL_COMMAND,
          selectionStart: start,
          selectionEnd: start + TRAVEL_COMMAND.length,
        });
        typing.current = false;
        runDocument(document);
      };
      if (prefersReducedMotion()) {
        launch();
        return;
      }
      const typeUpTo = (count: number) => {
        const text = prefix + TRAVEL_COMMAND.slice(0, count);
        query.update({
          text,
          selectionStart: text.length,
          selectionEnd: text.length,
        });
        schedule(
          count < TRAVEL_COMMAND.length ? () => typeUpTo(count + 1) : launch,
          TYPING_INTERVAL_MS,
        );
      };
      typeUpTo(0);
    },
    [queryStore, runDocument, schedule],
  );

  useEffect(() => {
    if (
      awaitingQuery.current &&
      activeDocument !== null &&
      isQueryDocument(activeDocument)
    ) {
      awaitingQuery.current = false;
      typeCommand(activeDocument);
    }
  }, [activeDocument, typeCommand]);

  const boardTardis = useCallback(() => {
    if (typing.current || awaitingQuery.current || traveling || playing) {
      return;
    }
    if (readConnectionStatus() !== "connected") {
      requestConnection();
      return;
    }
    if (activeDocument !== null && isQueryDocument(activeDocument)) {
      typeCommand(activeDocument);
    } else {
      awaitingQuery.current = true;
      openQuery();
    }
  }, [
    activeDocument,
    openQuery,
    requestConnection,
    traveling,
    playing,
    typeCommand,
  ]);

  useEffect(() => {
    if (traveling || playing) {
      return;
    }
    let step = 0;
    function listen(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      if (readConnectionStatus() === "pending") {
        step = 0;
        return;
      }
      const next = nextKonamiStep(step, event.key);
      if (next > step && step >= LETTERS_FROM) {
        event.preventDefault();
      }
      step = next;
      if (step === KONAMI_CODE.length) {
        step = 0;
        setKonamiGame(true);
      }
    }
    document.addEventListener("keydown", listen);
    return () => document.removeEventListener("keydown", listen);
  }, [traveling, playing]);

  const exitGame = useCallback(() => {
    setKonamiGame(false);
    if (effect?.kind === "game") {
      setClosedGameId(effect.id);
    }
  }, [effect]);

  const value = useMemo(
    () => ({ traveling, regenerating, playing, boardTardis, exitGame }),
    [traveling, regenerating, playing, boardTardis, exitGame],
  );

  return <EasterEggContext value={value}>{children}</EasterEggContext>;
}

export function useEasterEggs(): EasterEggValue {
  const value = useContext(EasterEggContext);
  if (!value) {
    throw new Error("useEasterEggs must be used inside EasterEggProvider");
  }
  return value;
}
