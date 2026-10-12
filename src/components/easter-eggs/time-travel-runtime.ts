import {
  readStorage,
  removeStorage,
  writeStorage,
} from "@/components/browser-storage";

export const TIME_TRAVEL_STORAGE_KEY = "time-travel";

const DESTINATION = "v1";

export function markDeparture(storage?: Pick<Storage, "setItem">): boolean {
  return writeStorage("session", TIME_TRAVEL_STORAGE_KEY, DESTINATION, storage);
}

export function takeArrival(
  storage?: Pick<Storage, "getItem" | "removeItem">,
): boolean {
  const departed =
    readStorage("session", TIME_TRAVEL_STORAGE_KEY, storage) === DESTINATION;
  return removeStorage("session", TIME_TRAVEL_STORAGE_KEY, storage) && departed;
}
