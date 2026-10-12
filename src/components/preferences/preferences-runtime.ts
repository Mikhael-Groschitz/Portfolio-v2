export const PREFERENCES_STORAGE_KEY = "preferences";
const MOTION_ATTRIBUTE = "data-motion";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const ZOOM_LEVELS = [70, 80, 90, 100, 110, 125, 150, 200] as const;

export type Zoom = (typeof ZOOM_LEVELS)[number];

export interface Preferences {
  zoom: Zoom;
  reduceMotion: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  zoom: 100,
  reduceMotion: false,
};

const BASE_FONT_SIZE = 14;
const BASE_LINE_HEIGHT = 20;

type PreferencesRoot = Pick<HTMLElement, "setAttribute"> & {
  style: Pick<CSSStyleDeclaration, "setProperty">;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isZoom(value: unknown): value is Zoom {
  return ZOOM_LEVELS.some((level) => level === value);
}

export function parsePreferences(raw: string | null): Preferences {
  let value: unknown = null;
  try {
    value = raw === null ? null : JSON.parse(raw);
  } catch {
    return DEFAULT_PREFERENCES;
  }
  if (!isRecord(value)) {
    return DEFAULT_PREFERENCES;
  }
  return {
    zoom: isZoom(value.zoom) ? value.zoom : DEFAULT_PREFERENCES.zoom,
    reduceMotion: value.reduceMotion === true,
  };
}

export function editorMetrics(zoom: Zoom): Record<string, string> {
  const scale = zoom / 100;
  return {
    "--editor-font-size": `${Math.round(BASE_FONT_SIZE * scale * 10) / 10}px`,
    "--editor-line-height": `${Math.round(BASE_LINE_HEIGHT * scale)}px`,
  };
}

export function applyPreferences(
  preferences: Preferences,
  systemReducesMotion: boolean,
  root: PreferencesRoot = document.documentElement,
): void {
  const reduce = preferences.reduceMotion || systemReducesMotion;
  root.setAttribute(MOTION_ATTRIBUTE, reduce ? "reduce" : "full");
  for (const [name, value] of Object.entries(editorMetrics(preferences.zoom))) {
    root.style.setProperty(name, value);
  }
}

const json = JSON.stringify;

export const PREFERENCES_SCRIPT = `(function(){var root=document.documentElement;var value=null;try{value=JSON.parse(localStorage.getItem(${json(PREFERENCES_STORAGE_KEY)}))}catch(error){}if(typeof value!=="object"||value===null||Array.isArray(value)){value={}}var levels=${json(ZOOM_LEVELS)};var zoom=levels.indexOf(value.zoom)!==-1?value.zoom:${DEFAULT_PREFERENCES.zoom};var system=false;try{system=window.matchMedia(${json(REDUCED_MOTION_QUERY)}).matches}catch(error){}root.setAttribute(${json(MOTION_ATTRIBUTE)},value.reduceMotion===true||system?"reduce":"full");var scale=zoom/100;root.style.setProperty("--editor-font-size",Math.round(${BASE_FONT_SIZE}*scale*10)/10+"px");root.style.setProperty("--editor-line-height",Math.round(${BASE_LINE_HEIGHT}*scale)+"px")})()`;

export function prefersReducedMotion(
  root: Pick<HTMLElement, "getAttribute"> = document.documentElement,
): boolean {
  const applied = root.getAttribute(MOTION_ATTRIBUTE);
  if (applied !== null) {
    return applied === "reduce";
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
