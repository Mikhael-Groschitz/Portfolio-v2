import { describe, expect, it } from "vitest";
import { SECTION_IDS } from "@/content/types";
import {
  QUERY_ROUTE,
  documentPath,
  isDocumentId,
  isQueryDocument,
  queryDocument,
  queryFileName,
  queryNumber,
  routeFromSegment,
} from "./section-routes";

describe("document routes", () => {
  it("gives every section its own address", () => {
    expect(SECTION_IDS.map(documentPath)).toEqual([
      "/about",
      "/tech-stack",
      "/career",
      "/projects",
      "/beyond-the-terminal",
      "/contact",
      "/resume",
    ]);
  });

  it("reads the section back from the address", () => {
    for (const section of SECTION_IDS) {
      expect(routeFromSegment(documentPath(section).slice(1))).toBe(section);
    }
  });

  it("sends every new query to the same address", () => {
    expect(documentPath(queryDocument(1))).toBe("/query");
    expect(documentPath(queryDocument(7))).toBe("/query");
    expect(routeFromSegment("query")).toBe(QUERY_ROUTE);
  });

  it("opens an empty window on the home page and on unknown addresses", () => {
    expect(routeFromSegment(null)).toBeNull();
    expect(routeFromSegment("palette")).toBeNull();
  });
});

describe("query documents", () => {
  it("numbers the queries like SSMS", () => {
    expect(queryFileName(queryDocument(1))).toBe("SQLQuery1.sql");
    expect(queryFileName(queryDocument(12))).toBe("SQLQuery12.sql");
    expect(queryNumber(queryDocument(3))).toBe(3);
  });

  it("tells queries and sections apart", () => {
    expect(isQueryDocument(queryDocument(2))).toBe(true);
    expect(isQueryDocument("career")).toBe(false);
  });

  it("only accepts known documents", () => {
    expect(isDocumentId("about")).toBe(true);
    expect(isDocumentId("query-4")).toBe(true);
    expect(isDocumentId("query-0")).toBe(false);
    expect(isDocumentId("query-x")).toBe(false);
    expect(isDocumentId("palette")).toBe(false);
    expect(isDocumentId(null)).toBe(false);
  });
});
