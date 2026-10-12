import { readFileSync } from "node:fs";
import { codeToTokens } from "shiki";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  hexFromRgb,
  isHexColor,
  readableInk,
  relativeLuminance,
} from "./contrast";
import { ssmsDarkTheme } from "./shiki-theme";
import { CONTRAST_PAIRS, TOKEN_NAMES, parseTokens } from "./tokens";

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("does not depend on argument order", () => {
    expect(contrastRatio("#0078d4", "#ffffff")).toBe(
      contrastRatio("#ffffff", "#0078d4"),
    );
  });

  it("accepts only #rrggbb colors", () => {
    expect(isHexColor("#1E1e1E")).toBe(true);
    expect(isHexColor("#12345")).toBe(false);
    expect(() => relativeLuminance("red")).toThrow();
  });

  it("turns a computed rgb() color into #rrggbb", () => {
    expect(hexFromRgb("rgb(240, 230, 140)")).toBe("#f0e68c");
    expect(hexFromRgb("rgba(0, 0, 0, 1)")).toBe("#000000");
    expect(hexFromRgb("rgba(0, 0, 0, 0.5)")).toBeNull();
    expect(hexFromRgb("rgb(256, 0, 0)")).toBeNull();
    expect(hexFromRgb("khaki")).toBeNull();
  });

  it("picks the text color that reads better on a background", () => {
    expect(readableInk("#f0e68c")).toBe("dark");
    expect(readableInk("#ffffff")).toBe("dark");
    expect(readableInk("#1f1f1f")).toBe("light");
    expect(readableInk("#1f3a5f")).toBe("light");
  });

  it("keeps any background at AA with the chosen text color", () => {
    for (const background of ["#7160e8", "#808080", "#ff0000", "#00ff00"]) {
      const ink = readableInk(background) === "dark" ? "#000000" : "#ffffff";
      expect(contrastRatio(background, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const tokens = parseTokens(css);
const colorOf = (name: string) => tokens.get(name) ?? "";

describe("tokens.css", () => {
  it("defines every expected token as a hex color", () => {
    for (const name of TOKEN_NAMES) {
      expect(isHexColor(colorOf(name)), name).toBe(true);
    }
  });

  it.each(CONTRAST_PAIRS)("$fg on $bg reaches $min:1", ({ fg, bg, min }) => {
    expect(contrastRatio(colorOf(fg), colorOf(bg))).toBeGreaterThanOrEqual(min);
  });

  it("declares the system font stacks", () => {
    expect(css).toMatch(/--font-code:\s*Consolas/);
    expect(css).toMatch(/--font-ui:\s*"Segoe UI"/);
  });
});

describe("shiki theme", () => {
  it("only references tokens that exist", () => {
    const references = JSON.stringify(ssmsDarkTheme).matchAll(
      /var\(--([a-z0-9-]+)\)/g,
    );
    for (const [, name] of references) {
      expect(tokens.has(name), name).toBe(true);
    }
  });

  it("colors T-SQL with the token variables", async () => {
    const { tokens: lines } = await codeToTokens("SELECT 1, 'x' -- note", {
      lang: "sql",
      theme: ssmsDarkTheme,
    });
    const colorOfText = (text: string) =>
      lines.flat().find((token) => token.content.trim() === text)?.color;

    expect(colorOfText("SELECT")).toBe("var(--syntax-keyword)");
    expect(colorOfText("1")).toBe("var(--syntax-number)");
    expect(colorOfText("'x'")).toBe("var(--syntax-string)");
  });
});

describe("site icon", () => {
  it("only uses palette colors", () => {
    const icon = readFileSync(
      new URL("../app/icon.svg", import.meta.url),
      "utf8",
    );
    const palette = new Set(tokens.values());
    const colors = [...icon.matchAll(/#[0-9a-f]{6}\b/gi)].map(([color]) =>
      color.toLowerCase(),
    );
    expect(colors.length).toBeGreaterThan(0);
    for (const color of colors) {
      expect(palette.has(color), color).toBe(true);
    }
  });
});
