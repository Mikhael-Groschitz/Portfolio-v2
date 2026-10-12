import { describe, expect, it } from "vitest";
import {
  NO_VISITS,
  type Visits,
  backVisits,
  canGoBack,
  canGoForward,
  forget,
  goTo,
  visit,
} from "./navigation-history";
import type { DocumentId } from "./section-routes";

function visited(...documents: DocumentId[]): Visits {
  return documents.reduce(visit, NO_VISITS);
}

describe("navigation history", () => {
  it("starts empty, with nowhere to go", () => {
    expect(canGoBack(NO_VISITS)).toBe(false);
    expect(canGoForward(NO_VISITS)).toBe(false);
    expect(backVisits(NO_VISITS)).toEqual([]);
  });

  it("records each document once in a row", () => {
    const visits = visited("about", "career", "career", "query-1");
    expect(visits).toEqual({
      entries: ["about", "career", "query-1"],
      index: 2,
    });
    expect(visit(visits, null)).toBe(visits);
    expect(canGoBack(visits)).toBe(true);
    expect(canGoForward(visits)).toBe(false);
  });

  it("goes back and forward without losing the way", () => {
    const visits = visited("about", "career", "query-1");
    const back = goTo(visits, 1);
    expect(back.index).toBe(1);
    expect(canGoForward(back)).toBe(true);
    expect(goTo(back, 2)).toEqual(visits);
    expect(goTo(back, 9)).toBe(back);
    expect(goTo(back, -1)).toBe(back);
  });

  it("drops the way forward after a new visit, like a browser", () => {
    const visits = visit(
      goTo(visited("about", "career", "query-1"), 0),
      "contact",
    );
    expect(visits).toEqual({ entries: ["about", "contact"], index: 1 });
  });

  it("lists the way back, newest first", () => {
    expect(backVisits(visited("about", "career", "query-1"))).toEqual([
      { document: "career", index: 1 },
      { document: "about", index: 0 },
    ]);
  });

  it("keeps only the last twenty visits", () => {
    const documents = Array.from(
      { length: 25 },
      (_, index): DocumentId => `query-${index + 1}`,
    );
    const visits = visited(...documents);
    expect(visits.entries).toHaveLength(20);
    expect(visits.entries[0]).toBe("query-6");
    expect(visits.index).toBe(19);
  });

  it("forgets a closed document and keeps the place", () => {
    const visits = visited("about", "career", "query-1");
    expect(forget(visits, "query-1")).toEqual({
      entries: ["about", "career"],
      index: 1,
    });
    expect(forget(goTo(visits, 1), "career")).toEqual({
      entries: ["about", "query-1"],
      index: 0,
    });
    expect(forget(visited("about"), "about")).toEqual(NO_VISITS);
    expect(forget(visits, "contact")).toBe(visits);
  });

  it("merges the neighbors a closed document leaves side by side", () => {
    expect(forget(visited("about", "career", "about"), "career")).toEqual({
      entries: ["about"],
      index: 0,
    });
  });
});
