import { describe, expect, it } from "vitest";
import { getTable } from "@/content";
import { LOCALES } from "@/content/locales";
import { SECTION_IDS } from "@/content/types";
import {
  CATALOG,
  catalogIdentifiers,
  catalogObject,
  findObject,
  qualifiedName,
} from "./catalog";

describe("catalog", () => {
  it("has exactly one object per section, in the section order", () => {
    expect(CATALOG.map((object) => object.section)).toEqual([...SECTION_IDS]);
  });

  it("keeps object names unique", () => {
    const names = CATALOG.map((object) => object.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("names objects with the dbo schema", () => {
    expect(qualifiedName(catalogObject("about"))).toBe("dbo.About");
    expect(qualifiedName(catalogObject("resume"))).toBe("dbo.sp_DownloadCV");
  });

  it("maps every column to a field of the section rows", () => {
    for (const object of CATALOG) {
      for (const locale of LOCALES) {
        for (const row of getTable(object.section, locale)) {
          for (const { name, field } of object.columns) {
            expect(Object.hasOwn(row, field), `${object.name}.${name}`).toBe(
              true,
            );
          }
        }
      }
    }
  });

  it("lists the names the editor should color as identifiers", () => {
    const identifiers = catalogIdentifiers();
    for (const name of ["Portfolio", "dbo", "Career", "Role", "SortOrder"]) {
      expect(identifiers.has(name), name).toBe(true);
    }
    expect(identifiers.has("SELECT")).toBe(false);
  });

  it("allows NULL only in the columns that can be empty", () => {
    for (const object of CATALOG) {
      for (const locale of LOCALES) {
        for (const row of getTable(object.section, locale)) {
          for (const column of object.columns) {
            const value = new Map(Object.entries(row)).get(column.field);
            if (value === null) {
              expect(column.nullable, `${object.name}.${column.name}`).toBe(
                true,
              );
            }
          }
        }
      }
    }
  });

  it("builds every primary key from real columns", () => {
    for (const object of CATALOG.filter((entry) => entry.kind === "table")) {
      const names = object.columns.map((column) => column.name);
      expect(object.primaryKey?.length, object.name).toBeGreaterThan(0);
      for (const key of object.primaryKey ?? []) {
        expect(names, object.name).toContain(key);
      }
    }
  });

  it("finds objects by any name a query may use", () => {
    for (const reference of ["dbo.Career", "career", "Portfolio.dbo.CAREER"]) {
      expect(findObject(reference)?.name).toBe("Career");
    }
    expect(findObject("dbo.Carrer")).toBeUndefined();
  });
});
