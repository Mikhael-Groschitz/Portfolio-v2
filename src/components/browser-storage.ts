type StorageArea = "session" | "local";

function storageFor(area: StorageArea): Storage {
  return area === "session" ? window.sessionStorage : window.localStorage;
}

export function readStorage(
  area: StorageArea,
  key: string,
  storage?: Pick<Storage, "getItem">,
): string | null {
  try {
    return (storage ?? storageFor(area)).getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(
  area: StorageArea,
  key: string,
  value: string,
  storage?: Pick<Storage, "setItem">,
): boolean {
  try {
    (storage ?? storageFor(area)).setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(
  area: StorageArea,
  key: string,
  storage?: Pick<Storage, "removeItem">,
): boolean {
  try {
    (storage ?? storageFor(area)).removeItem(key);
    return true;
  } catch {
    return false;
  }
}
