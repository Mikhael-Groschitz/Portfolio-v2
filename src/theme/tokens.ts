export const TOKEN_GROUPS = {
  structure: [
    "bg-window",
    "bg-panel",
    "bg-editor",
    "border",
    "text",
    "text-muted",
    "accent",
    "selection",
  ],
  bars: ["status-connected", "status-ready"],
  grid: ["grid-header", "grid-row", "grid-row-selected", "grid-border"],
  messages: ["text-error", "text-success"],
  intellisense: [
    "intellisense-bg",
    "intellisense-selected",
    "intellisense-border",
  ],
  syntax: [
    "syntax-keyword",
    "syntax-string",
    "syntax-comment",
    "syntax-function",
    "syntax-type",
    "syntax-variable",
    "syntax-number",
    "syntax-operator",
  ],
  extra: [
    "bg-tabstrip",
    "bg-tab-active",
    "bg-input",
    "bg-messages",
    "text-menu",
    "text-disabled",
    "text-on-status",
    "text-on-selection",
    "grid-row-selected-text",
    "focus-ring",
    "icon",
    "icon-folder",
    "tree-expander-border",
    "tree-expander-glyph",
    "status-success-icon",
    "status-warning-icon",
    "status-separator",
    "icon-execute",
  ],
  easterEggs: [
    "status-time-travel",
    "text-on-time-travel",
    "regeneration",
    "tardis-body",
    "tardis-shade",
    "tardis-window",
    "tardis-lamp",
  ],
} as const;

export type TokenGroup = keyof typeof TOKEN_GROUPS;
export type TokenName = (typeof TOKEN_GROUPS)[TokenGroup][number];

export const TOKEN_NAMES: readonly TokenName[] =
  Object.values(TOKEN_GROUPS).flat();

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

interface ContrastPair {
  fg: TokenName;
  bg: TokenName;
  min: number;
}

function textOn(fg: TokenName, ...bgs: TokenName[]): ContrastPair[] {
  return bgs.map((bg) => ({ fg, bg, min: AA_TEXT }));
}

function uiOn(fg: TokenName, ...bgs: TokenName[]): ContrastPair[] {
  return bgs.map((bg) => ({ fg, bg, min: AA_NON_TEXT }));
}

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  ...textOn(
    "text",
    "bg-window",
    "bg-panel",
    "bg-editor",
    "bg-tabstrip",
    "bg-tab-active",
    "bg-input",
    "bg-messages",
    "status-ready",
    "grid-header",
    "grid-row",
    "intellisense-bg",
    "intellisense-selected",
  ),
  ...textOn(
    "text-muted",
    "bg-window",
    "bg-panel",
    "bg-editor",
    "bg-tabstrip",
    "bg-tab-active",
    "bg-messages",
    "intellisense-bg",
    "intellisense-selected",
  ),
  ...textOn("text-menu", "bg-window", "bg-panel", "bg-tab-active"),
  ...textOn("text-on-status", "status-connected"),
  ...textOn("text-on-selection", "selection"),
  ...textOn("grid-row-selected-text", "grid-row-selected"),
  ...textOn("text-on-time-travel", "status-time-travel"),
  ...textOn("text-error", "bg-messages", "bg-panel"),
  ...textOn("text-success", "bg-messages", "bg-panel", "bg-tabstrip"),
  ...TOKEN_GROUPS.syntax.flatMap((token) => textOn(token, "bg-editor")),
  ...uiOn("accent", "bg-window"),
  ...uiOn("selection", "bg-panel", "intellisense-bg"),
  ...uiOn(
    "icon",
    "bg-window",
    "bg-panel",
    "bg-tabstrip",
    "bg-tab-active",
    "intellisense-bg",
    "intellisense-selected",
  ),
  ...uiOn("icon-folder", "bg-panel"),
  ...uiOn("icon-execute", "bg-window", "bg-tab-active"),
  ...uiOn("status-time-travel", "status-connected"),
  ...uiOn("tardis-body", "bg-window", "bg-panel"),
  ...uiOn("tardis-window", "tardis-body", "tardis-shade"),
  ...uiOn("regeneration", "bg-window", "bg-panel", "bg-editor"),
  ...uiOn("tree-expander-border", "bg-panel"),
  ...uiOn("tree-expander-glyph", "text"),
  ...uiOn(
    "focus-ring",
    "bg-window",
    "bg-panel",
    "bg-editor",
    "bg-tabstrip",
    "bg-tab-active",
    "bg-input",
    "bg-messages",
    "status-ready",
    "intellisense-bg",
  ),
];

export function parseTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of css.matchAll(
    /--([a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\b/gi,
  )) {
    tokens.set(name, value.toLowerCase());
  }
  return tokens;
}
