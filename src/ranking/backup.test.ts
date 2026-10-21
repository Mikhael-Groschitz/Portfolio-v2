import { describe, expect, it } from "vitest";
import { RANKING } from "@/game/balance";
import { BACKUP_FORMAT, createBackup, readBackup } from "./backup";

const now = new Date("2026-10-20T12:00:00.000Z");
const entries = [
  {
    name: "MGC",
    timeMs: 343_250,
    createdAt: new Date("2026-10-14T22:39:59.087Z"),
  },
  {
    name: "ABC",
    timeMs: 410_000,
    createdAt: new Date("2026-10-15T10:00:00.000Z"),
  },
];

function text(
  change: (data: Record<string, unknown>) => void = () => {},
): string {
  const data = JSON.parse(JSON.stringify(createBackup(entries, now)));
  change(data);
  return JSON.stringify(data);
}

describe("ranking export", () => {
  it("writes a versioned file with names, times and dates", () => {
    expect(createBackup(entries, now)).toEqual({
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: "2026-10-20T12:00:00.000Z",
      entries: [
        { name: "MGC", timeMs: 343_250, createdAt: "2026-10-14T22:39:59.087Z" },
        { name: "ABC", timeMs: 410_000, createdAt: "2026-10-15T10:00:00.000Z" },
      ],
    });
  });

  it("reads back what it wrote", () => {
    expect(readBackup(text(), now)).toEqual({ ok: true, entries });
  });
});

describe("ranking import validation", () => {
  const refused = (value: string) => {
    const reading = readBackup(value, now);
    return reading.ok ? null : reading.reason;
  };

  it("refuses files that are not a ranking export", () => {
    expect(refused("not json")).toMatch(/JSON/);
    expect(refused("[]")).toMatch(/exportação/);
    expect(refused(text((data) => (data.format = "other")))).toMatch(
      /exportação/,
    );
    expect(refused(text((data) => (data.extra = 1)))).toMatch(/exportação/);
    expect(refused(text((data) => (data.version = 2)))).toMatch(/versão 2/);
  });

  it("refuses more entries than the ranking keeps", () => {
    const many = Array.from({ length: RANKING.size + 1 }, () => entries[0]);
    expect(refused(JSON.stringify(createBackup(many, now)))).toMatch(
      /no máximo/,
    );
  });

  it("validates each entry like the game does", () => {
    const entry = (change: Record<string, unknown>) =>
      text((data) => {
        const [first] = data.entries as Record<string, unknown>[];
        Object.assign(first, change);
      });
    expect(refused(entry({ name: "mgc" }))).toMatch(/entrada 1 tem um nome/);
    expect(refused(entry({ timeMs: 1_000 }))).toMatch(/tempo/);
    expect(refused(entry({ timeMs: "343250" }))).toMatch(/tempo/);
    expect(refused(entry({ createdAt: "ontem" }))).toMatch(/data/);
    expect(refused(entry({ createdAt: "2026-12-01T00:00:00.000Z" }))).toMatch(
      /data/,
    );
    expect(refused(entry({ ip: "1.2.3.4" }))).toMatch(/campos inesperados/);
  });
});
