import {
  readStorage,
  removeStorage,
  writeStorage,
} from "@/components/browser-storage";
import {
  DEFAULT_LAYOUT,
  FLOATING,
  type Layout,
  PLACEMENTS,
  RESULTS_FORMATS,
  RESULTS_SHARE,
  RESULTS_STATES,
  TOOL_WINDOWS,
  type ToolWindowId,
  WINDOW_WIDTHS,
  layoutVariables,
  parseLayout,
  windowState,
} from "./layout-model";

const LAYOUT_STORAGE_KEY = "layout";
const RESULTS_ATTRIBUTE = "data-results";
const FORMAT_ATTRIBUTE = "data-results-format";

const json = JSON.stringify;
const defaults = DEFAULT_LAYOUT;

const WINDOW_DEFAULTS = TOOL_WINDOWS.map((id) => ({
  id,
  ...defaults[id],
  ...WINDOW_WIDTHS[id],
}));

export const LAYOUT_SCRIPT = `(function(){var root=document.documentElement;var value=null;try{value=JSON.parse(sessionStorage.getItem(${json(LAYOUT_STORAGE_KEY)}))}catch(error){}function record(v){return typeof v==="object"&&v!==null&&!Array.isArray(v)?v:{}}function num(v,f){return typeof v==="number"&&isFinite(v)?v:f}function clamp(v,a,b){return Math.min(Math.max(v,a),b)}function one(v,list,f){return list.indexOf(v)!==-1?v:f}function size(v,f,a){return Math.round(clamp(num(v,f),a,${FLOATING.maxSize}))}var data=record(value);var style=root.style;var windows=${json(WINDOW_DEFAULTS)};for(var i=0;i<windows.length;i++){var d=windows[i];var e=record(data[d.id]);var f=record(e.floating);var placement=one(e.placement,${json(PLACEMENTS)},d.placement);var mode=e.hidden===true?"hidden":placement==="autoHide"?"auto-hide":placement==="floating"?"floating":e.collapsed===true?"collapsed":"docked";root.setAttribute("data-"+d.id,mode);style.setProperty("--"+d.id+"-width",Math.round(clamp(num(e.width,d.width),d.min,d.max))+"px");style.setProperty("--"+d.id+"-float-x",size(f.x,d.floating.x,0)+"px");style.setProperty("--"+d.id+"-float-y",size(f.y,d.floating.y,0)+"px");style.setProperty("--"+d.id+"-float-width",size(f.width,d.floating.width,${FLOATING.minWidth})+"px");style.setProperty("--"+d.id+"-float-height",size(f.height,d.floating.height,${FLOATING.minHeight})+"px")}var r=record(data.results);var share=Math.round(clamp(num(r.share,${defaults.results.share}),${RESULTS_SHARE.min},${RESULTS_SHARE.max})*100)/100;var results=Math.round(share*100);root.setAttribute(${json(RESULTS_ATTRIBUTE)},one(r.state,${json(RESULTS_STATES)},${json(defaults.results.state)}));root.setAttribute(${json(FORMAT_ATTRIBUTE)},one(r.format,${json(RESULTS_FORMATS)},${json(defaults.results.format)}));style.setProperty("--results-grow",String(results));style.setProperty("--editor-grow",String(100-results))})()`;

type LayoutRoot = Pick<HTMLElement, "setAttribute"> & {
  style: Pick<CSSStyleDeclaration, "setProperty">;
};

let current: Layout | null = null;
let peeked: ToolWindowId | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function applyLayout(
  layout: Layout,
  root: LayoutRoot = document.documentElement,
): void {
  for (const id of TOOL_WINDOWS) {
    root.setAttribute(`data-${id}`, windowState(layout[id]));
  }
  root.setAttribute(RESULTS_ATTRIBUTE, layout.results.state);
  root.setAttribute(FORMAT_ATTRIBUTE, layout.results.format);
  for (const [name, value] of Object.entries(layoutVariables(layout))) {
    root.style.setProperty(name, value);
  }
}

export function readLayout(): Layout {
  current ??= parseLayout(readStorage("session", LAYOUT_STORAGE_KEY));
  return current;
}

export function updateLayout(change: (layout: Layout) => Layout): void {
  const next = change(readLayout());
  if (next === current) {
    return;
  }
  current = next;
  applyLayout(next);
  writeStorage("session", LAYOUT_STORAGE_KEY, JSON.stringify(next));
  notify();
}

export function resetLayout(): void {
  current = DEFAULT_LAYOUT;
  peeked = null;
  applyLayout(DEFAULT_LAYOUT);
  removeStorage("session", LAYOUT_STORAGE_KEY);
  notify();
}

export function readPeek(): ToolWindowId | null {
  return peeked;
}

export function setPeek(id: ToolWindowId | null): void {
  if (peeked !== id) {
    peeked = id;
    notify();
  }
}

export function subscribeToLayout(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
