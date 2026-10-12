import { useSyncExternalStore } from "react";
import { DEFAULT_LAYOUT, type Layout, type ToolWindowId } from "./layout-model";
import { readLayout, readPeek, subscribeToLayout } from "./layout-store";

function serverLayout(): Layout {
  return DEFAULT_LAYOUT;
}

function serverPeek(): ToolWindowId | null {
  return null;
}

export function useLayout(): Layout {
  return useSyncExternalStore(subscribeToLayout, readLayout, serverLayout);
}

export function usePeek(): ToolWindowId | null {
  return useSyncExternalStore(subscribeToLayout, readPeek, serverPeek);
}
