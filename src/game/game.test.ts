import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COLORS, type Color, PALETTE, TRANSPARENT } from "./palette";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SOURCE = join(ROOT, "src");
const GUARD = "src/game/game.test.ts";

const SERIES_TERMS = [
  "castlevania",
  "alucard",
  "belmont",
  "dracula",
  "symphony of the night",
];

const TRIGGER_TERM = "konami";

const TRIGGER_FILES = [
  "src/components/easter-eggs/easter-egg-context.tsx",
  "src/components/easter-eggs/easter-eggs.test.ts",
  "src/components/easter-eggs/konami.ts",
  "src/engine/easter-eggs.test.ts",
  "src/engine/easter-eggs.ts",
];

const files = readdirSync(SOURCE, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) =>
    relative(ROOT, join(entry.parentPath, entry.name)).split(sep).join("/"),
  )
  .filter((path) => path !== GUARD)
  .map((path) => ({
    path,
    text: `${path}\n${readFileSync(join(ROOT, path), "utf8")}`.toLowerCase(),
  }));

describe("brand guard", () => {
  it("scans the whole source tree", () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files.some(({ path }) => path.startsWith("src/game/"))).toBe(true);
  });

  it("keeps the names of the homaged series out of names, code and texts", () => {
    const offenders = files.filter(({ text }) =>
      SERIES_TERMS.some((term) => text.includes(term)),
    );
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });

  it("allows the trigger word only in the trigger files", () => {
    const offenders = files.filter(
      ({ path, text }) =>
        text.includes(TRIGGER_TERM) && !TRIGGER_FILES.includes(path),
    );
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });

  it("lists trigger files that still exist and still hold the trigger", () => {
    for (const trigger of TRIGGER_FILES) {
      const file = files.find(({ path }) => path === trigger);
      expect(file?.text, trigger).toContain(TRIGGER_TERM);
    }
  });
});

const TOKENS = readFileSync(
  fileURLToPath(new URL("../theme/tokens.css", import.meta.url)),
  "utf8",
);

const SYNTAX_TOKENS: Partial<Record<Color, string>> = {
  keyword: "--syntax-keyword",
  string: "--syntax-string",
  comment: "--syntax-comment",
  function: "--syntax-function",
};

function token(name: string): string | undefined {
  return TOKENS.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
}

describe("game palette", () => {
  it("keeps a small set of solid colors", () => {
    const colors = Object.values(COLORS);
    expect(colors.length).toBeLessThanOrEqual(32);
    for (const color of colors) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("gives every color a one-character key for the sprites", () => {
    expect(Object.keys(PALETTE)).not.toContain(TRANSPARENT);
    for (const [key, color] of Object.entries(PALETTE)) {
      expect(key).toHaveLength(1);
      expect(COLORS).toHaveProperty(color);
    }
    expect(new Set(Object.values(PALETTE)).size).toBe(
      Object.keys(COLORS).length,
    );
  });

  it("shares the syntax colors with the site theme", () => {
    for (const [color, name] of Object.entries(SYNTAX_TOKENS)) {
      expect(COLORS[color as Color]).toBe(token(name)?.toLowerCase());
    }
  });
});
