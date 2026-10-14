import { describe, expect, it } from "vitest";
import { getTable, getTexts, withLabels } from ".";
import {
  formatCompletionTime,
  formatCount,
  formatDuration,
  formatElapsed,
  formatYearMonth,
} from "./format";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locales";
import { type ByInput, INPUTS, SECTION_IDS } from "./types";

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const WEB_URL = /^https?:\/\/\S+$/;
const CONTACT_URL = /^(https?:\/\/|mailto:|tel:)\S+$/;
const LOCAL_PDF = /^\/\S+\.pdf$/;
const KEY_NAMES = /\b(?:F\d{1,2}|Ctrl|Shift|Enter|Esc|Tab)\b|\bAlt\+/;
const KEYBOARD_OR_MOUSE: Record<Locale, RegExp> = {
  "pt-BR":
    /\b(?:teclas?|pression\w*|apert\w*|cli(?:c|qu)\w*|mouse|arrast\w*)\b|\bbotão direito/i,
  en: /\b(?:keys?|press(?:es|ing)?|click\w*|hover\w*|drag(?:s|ged|ging)?|mouse)\b/i,
};

const otherLocales = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(shapeOf);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, shapeOf(entry)]),
    );
  }
  return value === null ? null : typeof value;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

function isByInput(value: object): value is ByInput<unknown> {
  const keys = Object.keys(value);
  return (
    !Array.isArray(value) &&
    keys.length === INPUTS.length &&
    INPUTS.every((input) => keys.includes(input))
  );
}

function touchStrings(value: unknown): string[] {
  if (typeof value !== "object" || value === null) {
    return collectStrings(value);
  }
  return isByInput(value)
    ? collectStrings(value.touch)
    : Object.values(value).flatMap(touchStrings);
}

function variantPairs(value: unknown): ByInput<unknown>[] {
  if (typeof value !== "object" || value === null) {
    return [];
  }
  return isByInput(value)
    ? [value]
    : Object.values(value).flatMap(variantPairs);
}

function citesKeyboardOrMouse(text: string, locale: Locale): boolean {
  return KEY_NAMES.test(text) || KEYBOARD_OR_MOUSE[locale].test(text);
}

function sharedFacts(locale: Locale) {
  const texts = getTexts(locale);
  return {
    name: texts.about.name,
    stackGrouping: texts.techStack.map(
      (row, index, rows) =>
        index > 0 && row.category === rows[index - 1].category,
    ),
    dates: texts.career.map(({ startDate, endDate }) => ({
      startDate,
      endDate,
    })),
    projects: texts.projects.map(({ stack, repoUrl, demoUrl }) => ({
      stack,
      repoUrl,
      demoUrl,
    })),
    traits: texts.beyondTheTerminal.map(({ trait }) => trait),
    contact: texts.contact.channels.map(({ value, url }) => ({ value, url })),
  };
}

describe("texts", () => {
  it("has the same structure in every language", () => {
    for (const locale of otherLocales) {
      expect(shapeOf(getTexts(locale))).toEqual(
        shapeOf(getTexts(DEFAULT_LOCALE)),
      );
    }
  });

  it("shares names, dates, links and stack grouping across languages", () => {
    for (const locale of otherLocales) {
      expect(sharedFacts(locale)).toEqual(sharedFacts(DEFAULT_LOCALE));
    }
  });

  it("fills every text", () => {
    for (const locale of LOCALES) {
      for (const text of collectStrings(getTexts(locale))) {
        expect(text.trim(), locale).not.toBe("");
      }
    }
  });

  it("names only real commands in the guide placeholders", () => {
    for (const locale of LOCALES) {
      const { tour, workspace, commands } = getTexts(locale).shell;
      const keys = collectStrings([
        tour.steps,
        tour.compactTablesText,
        tour.compactCheatsheetText,
        workspace.start,
      ]).flatMap((text) =>
        Array.from(text.matchAll(/\{(\w+)\}/g), ([, key]) => key),
      );
      expect(keys.length, locale).toBeGreaterThan(0);
      for (const key of keys) {
        expect(Object.hasOwn(commands, key), `${locale} {${key}}`).toBe(true);
      }
    }
  });

  it("uses year-month dates that start before they end", () => {
    for (const job of getTexts().career) {
      expect(YEAR_MONTH.test(job.startDate), job.company).toBe(true);
      if (job.endDate === null) {
        continue;
      }
      expect(YEAR_MONTH.test(job.endDate), job.company).toBe(true);
      expect(job.startDate <= job.endDate, job.company).toBe(true);
    }
  });

  it("uses valid links", () => {
    for (const locale of LOCALES) {
      const texts = getTexts(locale);
      for (const project of texts.projects) {
        for (const url of [project.repoUrl, project.demoUrl]) {
          if (url !== null) {
            expect(WEB_URL.test(url), project.name).toBe(true);
          }
        }
      }
      for (const item of texts.contact.channels) {
        expect(CONTACT_URL.test(item.url), item.value).toBe(true);
      }
      expect(LOCAL_PDF.test(texts.resume.url), locale).toBe(true);
    }
  });
});

describe("texts on touch screens", () => {
  it("never mention keys, shortcuts or the mouse", () => {
    for (const locale of LOCALES) {
      const offenders = touchStrings(getTexts(locale)).filter((text) =>
        citesKeyboardOrMouse(text, locale),
      );
      expect(offenders, locale).toEqual([]);
    }
  });

  it("keep a keyboard version only where it mentions keys or the mouse", () => {
    for (const locale of LOCALES) {
      for (const pair of variantPairs(getTexts(locale))) {
        const keyboard = collectStrings(pair.keyboard);
        expect(
          keyboard.some((text) => citesKeyboardOrMouse(text, locale)),
          keyboard.join(" | "),
        ).toBe(true);
      }
    }
  });
});

describe("withLabels", () => {
  it("fills the button names in both versions and keeps other placeholders", () => {
    expect(
      withLabels(
        { keyboard: "Click {newQuery}", touch: "Tap {newQuery}, {count}" },
        { newQuery: "New Query" },
      ),
    ).toEqual({ keyboard: "Click New Query", touch: "Tap New Query, {count}" });
    expect(withLabels("{constructor}", {})).toBe("{constructor}");
  });
});

describe("getTable", () => {
  it.each(SECTION_IDS)("returns %s rows in every language", (section) => {
    for (const locale of LOCALES) {
      expect(getTable(section, locale).length).toBeGreaterThan(0);
    }
  });

  it("lists the career from the newest job to the oldest", () => {
    for (const locale of LOCALES) {
      const dates = getTable("career", locale).map((job) => job.startDate);
      expect(dates).toEqual([...dates].sort().reverse());
    }
  });

  it("keeps each tech stack category together", () => {
    for (const locale of LOCALES) {
      const categories = getTable("tech-stack", locale).map(
        (row) => row.category,
      );
      const groups = categories.filter(
        (category, index) => category !== categories[index - 1],
      );
      expect(groups).toEqual([...new Set(categories)]);
    }
  });

  it("keeps project names, traits and contact channels unique", () => {
    for (const locale of LOCALES) {
      const names = getTable("projects", locale).map((project) => project.name);
      expect(new Set(names).size).toBe(names.length);
      const traits = getTable("beyond-the-terminal", locale).map(
        (row) => row.trait,
      );
      expect(new Set(traits).size).toBe(traits.length);
      const channels = getTable("contact", locale).map((item) => item.channel);
      expect(new Set(channels).size).toBe(channels.length);
    }
  });
});

describe("formatYearMonth", () => {
  it("formats in each language without shifting the month", () => {
    expect(formatYearMonth("2023-03", "en")).toBe("Mar 2023");
    expect(formatYearMonth("2024-12", "en")).toBe("Dec 2024");
    expect(formatYearMonth("2023-03", "pt-BR")).toBe("mar. de 2023");
    expect(formatYearMonth("2024-01", "pt-BR")).toBe("jan. de 2024");
  });
});

describe("formatCount", () => {
  const rows = {
    one: "({count} row affected)",
    other: "({count} rows affected)",
  };

  it("uses the singular only for exactly one", () => {
    expect(formatCount(rows, 1)).toBe("(1 row affected)");
    expect(formatCount(rows, 0)).toBe("(0 rows affected)");
    expect(formatCount(rows, 12)).toBe("(12 rows affected)");
  });
});

describe("formatCompletionTime", () => {
  const moment = new Date(Date.UTC(2026, 9, 6, 13, 23, 38, 830));

  it("writes the local time with seven fraction digits, like SSMS", () => {
    expect(formatCompletionTime(moment, -180)).toBe(
      "2026-10-06T10:23:38.8300000-03:00",
    );
  });

  it("handles positive and partial-hour offsets", () => {
    expect(formatCompletionTime(moment, 330)).toBe(
      "2026-10-06T18:53:38.8300000+05:30",
    );
    expect(formatCompletionTime(moment, 0)).toBe(
      "2026-10-06T13:23:38.8300000+00:00",
    );
  });
});

describe("formatElapsed", () => {
  it("shows hours, minutes and seconds", () => {
    expect(formatElapsed(120)).toBe("00:00:00");
    expect(formatElapsed(61_500)).toBe("00:01:01");
    expect(formatElapsed(3_723_000)).toBe("01:02:03");
  });
});

describe("formatDuration", () => {
  it("adds the milliseconds to the elapsed time", () => {
    expect(formatDuration(0)).toBe("00:00:00.000");
    expect(formatDuration(62.4)).toBe("00:00:00.062");
    expect(formatDuration(61_500)).toBe("00:01:01.500");
    expect(formatDuration(-5)).toBe("00:00:00.000");
  });
});
