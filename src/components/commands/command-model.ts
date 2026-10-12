import type { ResultsFormat } from "@/components/shell/layout-model";
import type { CommandId, MenuId } from "@/content/types";

type Requirement =
  | "always"
  | "never"
  | "connected"
  | "disconnected"
  | "document"
  | "editable"
  | "runnable"
  | "executing"
  | "undo"
  | "redo"
  | "back"
  | "forward"
  | "results"
  | "tabs";

type ToggleId = "explorer" | "results" | "cheatsheet" | "fullScreen";

interface CommandSpec {
  requires: Requirement;
  shortcut?: string;
  chord?: string;
  illustrative?: boolean;
  toggle?: ToggleId;
  format?: ResultsFormat;
}

const NEW_QUERY_SHORTCUT = "Alt+N";
export const FULL_SCREEN_SHORTCUT = "Shift+Alt+Enter";
export const SAVE_SHORTCUT = "Ctrl+S";
const COMMENT_CHORD = ["Ctrl+K", "Ctrl+C"] as const;
const UNCOMMENT_CHORD = ["Ctrl+K", "Ctrl+U"] as const;
const FIND_SHORTCUT = "Ctrl+F";
const OBJECT_EXPLORER_SHORTCUT = "F8";

export const COMMANDS: Record<CommandId, CommandSpec> = {
  connect: { requires: "always" },
  disconnect: { requires: "connected" },
  newQuery: { requires: "always", shortcut: NEW_QUERY_SHORTCUT },
  openFile: { requires: "connected", illustrative: true },
  openFolder: { requires: "connected", illustrative: true },
  closeDocument: { requires: "document" },
  save: { requires: "document", shortcut: SAVE_SHORTCUT },
  saveAll: { requires: "document", illustrative: true },
  undo: { requires: "undo", shortcut: "Ctrl+Z" },
  redo: { requires: "redo", shortcut: "Ctrl+Y" },
  cut: { requires: "editable", shortcut: "Ctrl+X" },
  copy: { requires: "document", shortcut: "Ctrl+C" },
  paste: { requires: "editable", shortcut: "Ctrl+V" },
  find: { requires: "editable", shortcut: FIND_SHORTCUT },
  selectAll: { requires: "document", shortcut: "Ctrl+A" },
  objectExplorer: {
    requires: "always",
    shortcut: OBJECT_EXPLORER_SHORTCUT,
    toggle: "explorer",
  },
  resultsPane: { requires: "results", toggle: "results" },
  cheatsheet: { requires: "always", toggle: "cheatsheet" },
  fullScreen: {
    requires: "always",
    shortcut: FULL_SCREEN_SHORTCUT,
    toggle: "fullScreen",
  },
  execute: { requires: "runnable", shortcut: "F5" },
  parse: { requires: "runnable" },
  cancelQuery: { requires: "executing" },
  estimatedPlan: { requires: "document", illustrative: true },
  queryDesigner: { requires: "document", illustrative: true },
  templateParameters: { requires: "document", illustrative: true },
  queryOptions: { requires: "document", illustrative: true },
  actualPlan: { requires: "document", illustrative: true },
  liveStatistics: { requires: "document", illustrative: true },
  clientStatistics: { requires: "document", illustrative: true },
  resultsToGrid: { requires: "document", format: "grid" },
  resultsToText: { requires: "document", format: "text" },
  resultsToFile: { requires: "document", illustrative: true },
  cloneRepository: { requires: "always", illustrative: true },
  createRepository: { requires: "always", illustrative: true },
  openOnGitHub: { requires: "always" },
  gitSettings: { requires: "always", illustrative: true },
  options: { requires: "always" },
  manageExtensions: { requires: "always", illustrative: true },
  customizeMenu: { requires: "always", illustrative: true },
  closeAllDocuments: { requires: "tabs" },
  resetWindowLayout: { requires: "always" },
  openCheatsheet: { requires: "always" },
  tour: { requires: "connected" },
  about: { requires: "always" },
  navigateBackward: { requires: "back" },
  navigateForward: { requires: "forward" },
  databaseEngineQuery: { requires: "connected", illustrative: true },
  deploy: { requires: "never" },
  editorConnect: { requires: "disconnected" },
  editorDisconnect: { requires: "connected" },
  commentLines: { requires: "editable", chord: COMMENT_CHORD.join(", ") },
  uncommentLines: { requires: "editable", chord: UNCOMMENT_CHORD.join(", ") },
  decreaseIndent: { requires: "editable" },
  increaseIndent: { requires: "editable" },
  customizeToolbar: { requires: "always", illustrative: true },
  contact: { requires: "always" },
  share: { requires: "always" },
  explorerConnect: { requires: "always" },
  explorerStop: { requires: "never" },
  explorerFilter: { requires: "connected", illustrative: true },
  explorerRefresh: { requires: "connected", illustrative: true },
  activityMonitor: { requires: "connected", illustrative: true },
  pinTab: { requires: "document", illustrative: true },
};

const SEPARATOR = "separator";

export type MenuEntry = CommandId | typeof SEPARATOR;

export interface MenuDefinition {
  id: MenuId;
  entries: readonly MenuEntry[];
  contextual?: boolean;
}

export const MENUS: readonly MenuDefinition[] = [
  {
    id: "file",
    entries: [
      "connect",
      "disconnect",
      SEPARATOR,
      "newQuery",
      "openFile",
      SEPARATOR,
      "closeDocument",
      SEPARATOR,
      "save",
      "saveAll",
    ],
  },
  {
    id: "edit",
    entries: [
      "undo",
      "redo",
      SEPARATOR,
      "cut",
      "copy",
      "paste",
      SEPARATOR,
      "find",
      "selectAll",
    ],
  },
  {
    id: "view",
    entries: [
      "objectExplorer",
      "resultsPane",
      "cheatsheet",
      SEPARATOR,
      "fullScreen",
    ],
  },
  {
    id: "query",
    contextual: true,
    entries: [
      "execute",
      "parse",
      "cancelQuery",
      SEPARATOR,
      "estimatedPlan",
      "queryDesigner",
      "templateParameters",
      "queryOptions",
      SEPARATOR,
      "actualPlan",
      "liveStatistics",
      "clientStatistics",
      SEPARATOR,
      "resultsToGrid",
      "resultsToText",
      "resultsToFile",
    ],
  },
  {
    id: "git",
    entries: [
      "cloneRepository",
      "createRepository",
      SEPARATOR,
      "openOnGitHub",
      SEPARATOR,
      "gitSettings",
    ],
  },
  { id: "tools", entries: ["options"] },
  { id: "extensions", entries: ["manageExtensions", "customizeMenu"] },
  { id: "window", entries: ["closeAllDocuments", "resetWindowLayout"] },
  { id: "help", entries: ["openCheatsheet", "tour", SEPARATOR, "about"] },
];

export type DocumentKind = "none" | "section" | "query";

export interface CommandContext {
  connected: boolean;
  document: DocumentKind;
  canUndo: boolean;
  canRedo: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  executing: boolean;
  hasResults: boolean;
  tabs: number;
}

function hasDocument(context: CommandContext): boolean {
  return context.connected && context.document !== "none";
}

function isEditable(context: CommandContext): boolean {
  return context.connected && context.document === "query";
}

const REQUIREMENTS: Record<Requirement, (context: CommandContext) => boolean> =
  {
    always: () => true,
    never: () => false,
    connected: (context) => context.connected,
    disconnected: (context) => !context.connected,
    document: hasDocument,
    editable: isEditable,
    runnable: (context) => hasDocument(context) && !context.executing,
    executing: (context) => hasDocument(context) && context.executing,
    undo: (context) => isEditable(context) && context.canUndo,
    redo: (context) => isEditable(context) && context.canRedo,
    back: (context) => context.canGoBack,
    forward: (context) => context.canGoForward,
    results: (context) => context.hasResults,
    tabs: (context) => context.tabs > 0,
  };

export function isAvailable(id: CommandId, context: CommandContext): boolean {
  return REQUIREMENTS[COMMANDS[id].requires](context);
}

export function isMenuCommand(entry: MenuEntry): entry is CommandId {
  return entry !== SEPARATOR;
}

export function isMenuShown(
  menu: MenuDefinition,
  context: CommandContext,
): boolean {
  return !menu.contextual || context.document !== "none";
}

export function commandLabel(label: string): string {
  return label.replace(/\.\.\.$|…$/, "");
}

export function shortcutText(id: CommandId): string | undefined {
  const { shortcut, chord } = COMMANDS[id];
  return shortcut ?? chord;
}
