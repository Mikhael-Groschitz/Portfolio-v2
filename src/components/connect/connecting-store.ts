import { useSyncExternalStore } from "react";

let connecting = false;
const listeners = new Set<() => void>();

export function markConnecting(next: boolean): void {
  if (connecting !== next) {
    connecting = next;
    for (const listener of listeners) {
      listener();
    }
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useConnecting(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => connecting,
    () => false,
  );
}
