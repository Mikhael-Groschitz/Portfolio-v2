import { localizedPath } from "@/components/locale/locale-routing";
import { documentPath } from "@/components/shell/section-routes";
import { getTexts } from "@/content";
import type { Locale } from "@/content/locales";
import { byProfile } from "@/content/profiles";
import {
  CATALOG,
  type CatalogObjectKind,
  DATABASE,
  SERVER,
  qualifiedName,
} from "@/engine/catalog";
import type { TreeNode } from "./tree-model";

function objectNodes(kind: CatalogObjectKind, locale: Locale): TreeNode[] {
  return CATALOG.filter((object) => object.kind === kind).map((object) => ({
    id: object.section,
    label: qualifiedName(object),
    icon: kind,
    href: localizedPath(documentPath(object.section), locale),
  }));
}

function folder(id: string, label: string, children: TreeNode[]): TreeNode {
  return { id, label, icon: "folder", children };
}

export function explorerNodes(locale: Locale): TreeNode[] {
  const { explorer, connection } = getTexts(locale).shell;

  return [
    {
      id: "server",
      icon: "server",
      label: byProfile(
        (profile) =>
          `${SERVER.name} (${SERVER.product} ${SERVER.version} - ${connection.login[profile]})`,
      ),
      children: [
        folder("databases", explorer.databases, [
          {
            id: "database",
            icon: "database",
            label: DATABASE,
            children: [
              folder("tables", explorer.tables, objectNodes("table", locale)),
              folder("programmability", explorer.programmability, [
                folder(
                  "stored-procedures",
                  explorer.storedProcedures,
                  objectNodes("procedure", locale),
                ),
              ]),
            ],
          },
        ]),
      ],
    },
  ];
}
