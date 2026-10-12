import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_SCRIPT,
  applyPreferences,
  editorMetrics,
  parsePreferences,
  prefersReducedMotion,
} from "./preferences-runtime";

function fakeRoot() {
  const attributes = new Map<string, string>();
  const styles = new Map<string, string>();
  return {
    attributes,
    styles,
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => {
      attributes.set(name, value);
    },
    style: {
      setProperty: (name: string, value: string | null) => {
        styles.set(name, String(value));
      },
    },
  };
}

function snapshot(root: ReturnType<typeof fakeRoot>) {
  return {
    attributes: Object.fromEntries(root.attributes),
    styles: Object.fromEntries(root.styles),
  };
}

function runHeadScript(raw: string | null, systemReduces = false) {
  const root = fakeRoot();
  runInNewContext(PREFERENCES_SCRIPT, {
    document: { documentElement: root },
    localStorage: { getItem: () => raw },
    window: { matchMedia: () => ({ matches: systemReduces }) },
  });
  return snapshot(root);
}

function applied(raw: string | null, systemReduces = false) {
  const root = fakeRoot();
  applyPreferences(parsePreferences(raw), systemReduces, root);
  return snapshot(root);
}

describe("preferences", () => {
  it("starts at 100 % with animations on", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(editorMetrics(100)).toEqual({
      "--editor-font-size": "14px",
      "--editor-line-height": "20px",
    });
    expect(editorMetrics(125)).toEqual({
      "--editor-font-size": "17.5px",
      "--editor-line-height": "25px",
    });
  });

  it("ignores broken or unknown values", () => {
    for (const raw of ["{", "[]", '{"zoom":63,"reduceMotion":"yes"}']) {
      expect(parsePreferences(raw)).toEqual(DEFAULT_PREFERENCES);
    }
  });

  it.each([
    [null, false],
    ['{"zoom":150,"reduceMotion":true}', false],
    ['{"zoom":80}', true],
    ["{", false],
  ])("paints %s the same way before and after hydration", (raw, system) => {
    expect(runHeadScript(raw, system)).toEqual(applied(raw, system));
  });

  it("reduces motion when the visitor or the system asks for it", () => {
    expect(applied(null).attributes["data-motion"]).toBe("full");
    expect(applied('{"reduceMotion":true}').attributes["data-motion"]).toBe(
      "reduce",
    );
    expect(applied(null, true).attributes["data-motion"]).toBe("reduce");
    const root = fakeRoot();
    root.setAttribute("data-motion", "reduce");
    expect(prefersReducedMotion(root)).toBe(true);
  });

  it("keeps working when storage is blocked", () => {
    const root = fakeRoot();
    runInNewContext(PREFERENCES_SCRIPT, {
      document: { documentElement: root },
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
      window: { matchMedia: () => ({ matches: false }) },
    });
    expect(snapshot(root)).toEqual(applied(null));
  });
});
