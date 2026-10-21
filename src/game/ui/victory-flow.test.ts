import { describe, expect, it } from "vitest";
import type { PublicEntry } from "@/ranking/protocol";
import { GAME_TEXTS } from "./texts";
import {
  afterSubmit,
  findSaved,
  finishAnnouncement,
  finishLine,
  placeName,
  planFinish,
  toRankingMs,
} from "./victory-flow";

const pt = GAME_TEXTS["pt-BR"];
const en = GAME_TEXTS.en;
const token = { kind: "token", token: "v1.abc" } as const;

function top(count: number, from = 300_000): PublicEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    position: index + 1,
    name: "AAA",
    timeMs: from + index * 10_000,
  }));
}

describe("the time of the run", () => {
  it("is the victory time in whole milliseconds", () => {
    expect(toRankingMs(343_250.999)).toBe(343_250);
    expect(toRankingMs((20_595 * 1000) / 60)).toBe(343_250);
  });
});

describe("planning the end of a run", () => {
  it("opens the name entry when the time makes the top 10", () => {
    expect(
      planFinish(token, { kind: "ready", entries: top(3) }, 305_000),
    ).toEqual({ kind: "entry", position: 2, saving: false, problem: null });
    expect(planFinish(token, { kind: "ready", entries: [] }, 999_000)).toEqual({
      kind: "entry",
      position: 1,
      saving: false,
      problem: null,
    });
  });

  it("puts a tie behind whoever got there first", () => {
    expect(
      planFinish(token, { kind: "ready", entries: top(3) }, 300_000),
    ).toMatchObject({ kind: "entry", position: 2 });
    expect(
      planFinish(token, { kind: "ready", entries: top(10) }, 390_000),
    ).toEqual({ kind: "outside", tenthMs: 390_000 });
  });

  it("shows how far the 10th place was when the time does not make it", () => {
    expect(
      planFinish(token, { kind: "ready", entries: top(10) }, 400_000),
    ).toEqual({ kind: "outside", tenthMs: 390_000 });
  });

  it("stays quiet when the ranking is off and explains a run with no token", () => {
    const ready = { kind: "ready", entries: top(3) } as const;
    expect(planFinish({ kind: "off" }, ready, 1)).toEqual({ kind: "quiet" });
    expect(planFinish(token, { kind: "off" }, 1)).toEqual({ kind: "quiet" });
    expect(planFinish({ kind: "none" }, ready, 1)).toEqual({
      kind: "ineligible",
    });
    expect(
      planFinish(
        { kind: "none" },
        { kind: "ready", entries: top(10) },
        999_000,
      ),
    ).toMatchObject({ kind: "outside" });
  });

  it("waits for the top 10 or says it could not check it", () => {
    expect(planFinish(token, { kind: "loading" }, 1)).toEqual({
      kind: "checking",
    });
    expect(planFinish(token, { kind: "error" }, 1)).toEqual({
      kind: "unknown",
    });
  });
});

describe("after sending the name", () => {
  const sent = { name: "MGC", timeMs: 310_000, position: 2 };

  it("highlights the new row and keeps the entries the API sent back", () => {
    const entries = top(4);
    expect(
      afterSubmit({ kind: "entered", position: 2, entries }, sent),
    ).toEqual({
      finish: { kind: "saved", position: 2, name: "MGC" },
      entries,
      highlight: 2,
      reload: false,
    });
  });

  it("explains a top 10 that got faster while the run went on", () => {
    expect(
      afterSubmit({ kind: "outside", entries: top(10) }, sent),
    ).toMatchObject({
      finish: { kind: "outside", tenthMs: 390_000 },
      highlight: null,
    });
  });

  it("treats a token already used as a save that went through", () => {
    const entries = [
      { position: 1, name: "ZZZ", timeMs: 300_000 },
      { position: 2, name: "MGC", timeMs: 310_000 },
    ];
    expect(afterSubmit({ kind: "used", entries }, sent)).toMatchObject({
      finish: { kind: "saved", position: 2, name: "MGC" },
      highlight: 2,
    });
    expect(afterSubmit({ kind: "used", entries: null }, sent)).toMatchObject({
      finish: { kind: "entry", saving: true },
      reload: true,
    });
    expect(findSaved(top(3), "MGC", 310_000)).toMatchObject({
      finish: { kind: "sent" },
      highlight: null,
    });
  });

  it("keeps the entry open after a refused name or a failure", () => {
    expect(afterSubmit({ kind: "refused" }, sent).finish).toEqual({
      kind: "entry",
      position: 2,
      saving: false,
      problem: "refused",
    });
    expect(afterSubmit({ kind: "retry" }, sent).finish).toMatchObject({
      kind: "entry",
      problem: "failed",
    });
    expect(
      afterSubmit({ kind: "closed", reason: "limit" }, sent).finish,
    ).toEqual({ kind: "closed", reason: "limit" });
  });
});

describe("victory texts", () => {
  it("names the place in each language", () => {
    expect(placeName(3, pt)).toBe("3º");
    expect(placeName(1, en)).toBe("1st");
    expect(placeName(10, en)).toBe("10th");
    expect(pt.record.places).toHaveLength(10);
    expect(en.record.places).toHaveLength(10);
  });

  it("tells the time and how much was missing for the 10th place", () => {
    expect(finishLine({ kind: "outside", tenthMs: 367_250 }, 432_400, pt)).toBe(
      "Faltaram 01:05.15 para o 10º lugar (06:07.25).",
    );
    expect(finishLine({ kind: "outside", tenthMs: 432_400 }, 432_400, pt)).toBe(
      pt.record.lines.tie,
    );
  });

  it("confirms the saved row and stays silent while the entry is open", () => {
    expect(finishLine({ kind: "saved", position: 3, name: "MGC" }, 1, pt)).toBe(
      "Recorde salvo: MGC em 3º lugar.",
    );
    expect(
      finishLine(
        { kind: "entry", position: 3, saving: false, problem: null },
        1,
        pt,
      ),
    ).toBeNull();
    expect(finishLine({ kind: "quiet" }, 1, pt)).toBeNull();
  });

  it("announces the place, the problems and the saved record", () => {
    const entry = {
      kind: "entry",
      position: 3,
      saving: false,
      problem: null,
    } as const;
    expect(finishAnnouncement(entry, 343_250, pt)).toBe(
      "Novo recorde! 3º lugar com 05:43.25. Digite suas iniciais e aperte Enter para salvar.",
    );
    expect(
      finishAnnouncement({ ...entry, problem: "refused" }, 343_250, pt),
    ).toBe(pt.record.problems.refused);
    expect(
      finishAnnouncement({ kind: "saved", position: 3, name: "MGC" }, 1, en),
    ).toBe("Record saved! MGC is in 3rd place on the ranking.");
  });
});
