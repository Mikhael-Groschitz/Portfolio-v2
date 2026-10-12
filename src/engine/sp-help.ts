import type { Locale, Localized } from "@/content/locales";
import {
  CATALOG,
  type CatalogColumn,
  type CatalogObject,
  DATABASE,
  OBJECT_TYPES,
  SCHEMA,
  type SqlType,
  findObject,
  qualifiedName,
} from "./catalog";
import { V2_LAUNCH_DATE } from "./easter-eggs";
import { ERROR_LEVEL, ERROR_STATE } from "./errors";
import type { Cell, ResultSet, StatementOutput } from "./execute";
import { type QueryHint, commandFor, similarObject } from "./hints";
import type { Statement } from "./normalize";

export const OBJECT_NOT_FOUND = 15009;

const COLLATION = "Latin1_General_CI_AS";
const CREATED = `${V2_LAUNCH_DATE} 00:00:00.000`;
const FILEGROUP = "PRIMARY";
const NOT_APPLICABLE = "(n/a)";

const SP_HELP_CALL = /^(?:exec(?:ute)? )?(?:sys\.)?sp_help ([\s\S]+)$/;
const ARGUMENT =
  /^(?:exec(?:ute)?\s+)?(?:sys\.)?sp_help\s+(?:@objname\s*=\s*)?([\s\S]+)$/i;
const QUOTED = /^N?'((?:[^']|'')*)'$/i;

const MESSAGES = {
  notFound: {
    "pt-BR": `O objeto '{name}' não existe no banco de dados '${DATABASE}' ou é inválido para esta operação.`,
    en: `The object '{name}' does not exist in database '${DATABASE}' or is invalid for this operation.`,
  },
  noForeignKeys: {
    "pt-BR":
      "Nenhuma chave estrangeira faz referência à tabela '{table}', ou você não tem permissão nas tabelas que a referenciam.",
    en: "No foreign keys reference table '{table}', or you do not have permissions on referencing tables.",
  },
  noSchemaBoundViews: {
    "pt-BR":
      "Nenhuma exibição com associação de esquema faz referência à tabela '{table}'.",
    en: "No views with schema binding reference table '{table}'.",
  },
} satisfies Record<string, Localized>;

type ObjectHelp =
  | { kind: "results"; results: StatementOutput[] }
  | {
      kind: "error";
      code: number;
      level: number;
      state: number;
      message: string;
      hint: QueryHint;
    };

function text(value: string): Cell {
  return { kind: "text", text: value };
}

const NULL: Cell = { kind: "null" };

function resultSet(
  source: string,
  columns: readonly string[],
  rows: readonly (readonly Cell[])[],
): ResultSet {
  return {
    source,
    columns: columns.map((name) => ({ name, type: "text" })),
    rows,
  };
}

function byteLength(type: SqlType): number {
  if (type.length === "max") {
    return -1;
  }
  return type.name === "nvarchar" ? type.length * 2 : type.length;
}

function columnRow({ name, sqlType, nullable }: CatalogColumn): Cell[] {
  const unicode = sqlType.name === "nvarchar";
  const yesOrNo = (value: boolean) => (value ? "yes" : "no");
  return [
    text(name),
    text(sqlType.name),
    text("no"),
    text(String(byteLength(sqlType))),
    text(""),
    text(""),
    text(yesOrNo(nullable)),
    text(unicode ? NOT_APPLICABLE : "no"),
    text(unicode ? NOT_APPLICABLE : yesOrNo(nullable)),
    text(COLLATION),
  ];
}

function tableSets(object: CatalogObject, source: string): ResultSet[] {
  const key = `PK_${object.name}`;
  const keys = (object.primaryKey ?? []).join(", ");
  return [
    resultSet(
      source,
      [
        "Column_name",
        "Type",
        "Computed",
        "Length",
        "Prec",
        "Scale",
        "Nullable",
        "TrimTrailingBlanks",
        "FixedLenNullInSource",
        "Collation",
      ],
      object.columns.map(columnRow),
    ),
    resultSet(
      source,
      ["Identity", "Seed", "Increment", "Not For Replication"],
      [[text("No identity column defined."), NULL, NULL, NULL]],
    ),
    resultSet(
      source,
      ["RowGuidCol"],
      [[text("No rowguidcol column defined.")]],
    ),
    resultSet(source, ["Data_located_on_filegroup"], [[text(FILEGROUP)]]),
    resultSet(
      source,
      ["index_name", "index_description", "index_keys"],
      [
        [
          text(key),
          text(`clustered, unique, primary key located on ${FILEGROUP}`),
          text(keys),
        ],
      ],
    ),
    resultSet(
      source,
      [
        "constraint_type",
        "constraint_name",
        "delete_action",
        "update_action",
        "status_enabled",
        "status_for_replication",
        "constraint_keys",
      ],
      [
        [
          text("PRIMARY KEY (clustered)"),
          text(key),
          text(NOT_APPLICABLE),
          text(NOT_APPLICABLE),
          text(NOT_APPLICABLE),
          text(NOT_APPLICABLE),
          text(keys),
        ],
      ],
    ),
  ];
}

function objectHelp(object: CatalogObject, locale: Locale): StatementOutput[] {
  const name = qualifiedName(object);
  const source = `sp_help '${name}'`;
  const sets = [
    resultSet(
      source,
      ["Name", "Owner", "Type", "Created_datetime"],
      [
        [
          text(object.name),
          text(SCHEMA),
          text(OBJECT_TYPES[object.kind]),
          text(CREATED),
        ],
      ],
    ),
    ...(object.kind === "table" ? tableSets(object, source) : []),
  ];
  const notes =
    object.kind === "table"
      ? [MESSAGES.noForeignKeys, MESSAGES.noSchemaBoundViews].map(
          (message): StatementOutput => ({
            kind: "info",
            text: message[locale].replace("{table}", name),
          }),
        )
      : [];
  return [
    ...sets.map((set): StatementOutput => ({ kind: "rows", resultSet: set })),
    ...notes,
  ];
}

function argumentOf(original: string): string {
  const raw = ARGUMENT.exec(original.trim())?.[1]?.trim() ?? "";
  const quoted = QUOTED.exec(raw);
  return quoted ? quoted[1].replaceAll("''", "'") : raw;
}

function hintFor(name: string): QueryHint {
  const similar = similarObject(name);
  return similar
    ? { kind: "similar", command: `EXEC sp_help '${qualifiedName(similar)}'` }
    : { kind: "help", command: commandFor(CATALOG[0]) };
}

export function isObjectHelp(statement: string): boolean {
  return SP_HELP_CALL.test(statement);
}

export function helpForStatement(
  statement: Statement,
  locale: Locale,
): ObjectHelp {
  const name = argumentOf(statement.original);
  const object = findObject(name.replace(/[[\]]/g, "").trim());
  if (object) {
    return { kind: "results", results: objectHelp(object, locale) };
  }
  return {
    kind: "error",
    code: OBJECT_NOT_FOUND,
    level: ERROR_LEVEL,
    state: ERROR_STATE,
    message: MESSAGES.notFound[locale].replace("{name}", name),
    hint: hintFor(name),
  };
}

export function helpCall(selection: string): string {
  const name = selection.trim();
  return name
    ? `EXEC sp_help N'${name.replaceAll("'", "''")}'`
    : "EXEC sp_help";
}
