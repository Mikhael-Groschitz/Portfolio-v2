"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Input } from "@/content/types";
import { TOUCH_MEDIA_QUERY } from "./breakpoints";

function matchesOnServer(): boolean {
  return false;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const matches = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, matches, matchesOnServer);
}

export function useInput(): Input {
  return useMediaQuery(TOUCH_MEDIA_QUERY) ? "touch" : "keyboard";
}
