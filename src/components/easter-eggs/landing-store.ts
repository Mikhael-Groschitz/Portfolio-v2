"use client";

import { useSyncExternalStore } from "react";

let landing = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startLanding(): void {
  if (!landing) {
    landing = true;
    notify();
  }
}

export function endLanding(): void {
  if (landing) {
    landing = false;
    notify();
  }
}

export function useLanding(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => landing,
    () => false,
  );
}
