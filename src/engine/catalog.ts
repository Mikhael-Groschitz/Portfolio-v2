import type { SectionId } from "@/content/types";

export const SERVER = {
  name: "mgroschitz.dev",
  product: "Portfolio Server",
  version: "2.0",
} as const;

export const DATABASE = "Portfolio";

export const V1_DATABASE = "Portfolio_v1";

export const SCHEMA = "dbo";

export type CatalogObjectKind = "table" | "procedure";

export const OBJECT_TYPES: Record<CatalogObjectKind, string> = {
  table: "user table",
  procedure: "stored procedure",
};

export type CatalogColumnType = "text" | "long" | "url" | "download";

export type SqlType =
  | { name: "nvarchar"; length: number | "max" }
  | { name: "char"; length: number };

export interface CatalogColumn {
  name: string;
  field: string;
  type: CatalogColumnType;
  sqlType: SqlType;
  nullable: boolean;
  fileField?: string;
}

interface CatalogOrder {
  column: string;
  descending?: boolean;
}

export interface CatalogObject {
  section: SectionId;
  kind: CatalogObjectKind;
  name: string;
  columns: readonly CatalogColumn[];
  orderBy?: CatalogOrder;
  primaryKey?: readonly string[];
}

interface ColumnOptions {
  type?: CatalogColumnType;
  nullable?: boolean;
  fileField?: string;
}

function nvarchar(length: number | "max"): SqlType {
  return { name: "nvarchar", length };
}

function char(length: number): SqlType {
  return { name: "char", length };
}

function column(
  name: string,
  field: string,
  sqlType: SqlType,
  { type = "text", nullable = false, fileField }: ColumnOptions = {},
): CatalogColumn {
  return {
    name,
    field,
    type,
    sqlType,
    nullable,
    ...(fileField && { fileField }),
  };
}

export const CATALOG: readonly CatalogObject[] = [
  {
    section: "about",
    kind: "table",
    name: "About",
    columns: [
      column("Name", "name", nvarchar(100)),
      column("Role", "role", nvarchar(100)),
      column("Summary", "summary", nvarchar("max"), { type: "long" }),
    ],
    primaryKey: ["Name"],
  },
  {
    section: "tech-stack",
    kind: "table",
    name: "TechStack",
    columns: [
      column("Category", "category", nvarchar(50)),
      column("Technology", "technology", nvarchar(50)),
    ],
    orderBy: { column: "SortOrder" },
    primaryKey: ["Category", "Technology"],
  },
  {
    section: "career",
    kind: "table",
    name: "Career",
    columns: [
      column("Company", "company", nvarchar(100)),
      column("Role", "role", nvarchar(100)),
      column("StartDate", "startDate", char(7)),
      column("EndDate", "endDate", char(7), { nullable: true }),
      column("Description", "description", nvarchar("max"), { type: "long" }),
    ],
    orderBy: { column: "StartDate", descending: true },
    primaryKey: ["Company", "StartDate"],
  },
  {
    section: "projects",
    kind: "table",
    name: "Projects",
    columns: [
      column("Name", "name", nvarchar(100)),
      column("Category", "categories", nvarchar(200)),
      column("Description", "description", nvarchar("max"), { type: "long" }),
      column("Stack", "stack", nvarchar(400)),
      column("RepoUrl", "repoUrl", nvarchar(400), {
        type: "url",
        nullable: true,
      }),
      column("DemoUrl", "demoUrl", nvarchar(400), {
        type: "url",
        nullable: true,
      }),
    ],
    primaryKey: ["Name"],
  },
  {
    section: "beyond-the-terminal",
    kind: "table",
    name: "BeyondTheTerminal",
    columns: [
      column("Trait", "trait", nvarchar(100)),
      column("Description", "description", nvarchar("max"), { type: "long" }),
    ],
    primaryKey: ["Trait"],
  },
  {
    section: "contact",
    kind: "table",
    name: "Contact",
    columns: [
      column("Channel", "channel", nvarchar(50)),
      column("Value", "value", nvarchar(200)),
      column("Url", "url", nvarchar(400), { type: "url" }),
    ],
    primaryKey: ["Channel"],
  },
  {
    section: "resume",
    kind: "procedure",
    name: "sp_DownloadCV",
    columns: [
      column("FileName", "fileName", nvarchar(260)),
      column("Url", "url", nvarchar(400), {
        type: "download",
        fileField: "fileName",
      }),
    ],
  },
];

export function qualifiedName(object: CatalogObject): string {
  return `${SCHEMA}.${object.name}`;
}

export function objectReferences(name: string): string[] {
  return [`${SCHEMA}.${name}`, name, `${DATABASE}.${SCHEMA}.${name}`];
}

export function catalogObject(section: SectionId): CatalogObject {
  const object = CATALOG.find((entry) => entry.section === section);
  if (!object) {
    throw new Error(`No catalog object for section "${section}"`);
  }
  return object;
}

export function findObject(reference: string): CatalogObject | undefined {
  const target = reference.toLowerCase();
  return CATALOG.find((object) =>
    objectReferences(object.name).some(
      (candidate) => candidate.toLowerCase() === target,
    ),
  );
}

export function catalogIdentifiers(): Set<string> {
  return new Set([
    DATABASE,
    SCHEMA,
    ...CATALOG.flatMap((object) => [
      object.name,
      ...object.columns.map((entry) => entry.name),
      ...(object.orderBy ? [object.orderBy.column] : []),
    ]),
  ]);
}
