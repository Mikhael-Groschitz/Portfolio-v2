import { describe, expect, it } from "vitest";
import { CATALOG, qualifiedName } from "@/engine/catalog";
import { explorerNodes } from "./explorer-nodes";
import {
  type TreeNode,
  expandableIds,
  isExpandable,
  moveForKey,
  visibleNodes,
} from "./tree-model";

function leaves(nodes: readonly TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) =>
    isExpandable(node) ? leaves(node.children ?? []) : [node],
  );
}

describe("explorerNodes", () => {
  const nodes = explorerNodes("pt-BR");

  it("shows every catalog object once, by its qualified name", () => {
    expect(leaves(nodes).map((node) => node.label)).toEqual(
      CATALOG.map(qualifiedName),
    );
  });

  it("uses the section ids for the objects", () => {
    expect(leaves(nodes).map((node) => node.id)).toEqual(
      CATALOG.map((object) => object.section),
    );
  });

  it("names the server with the login of each profile", () => {
    expect(nodes[0].label).toMatchObject({
      visitor: expect.stringMatching(/ - visitante\)$/),
      dev: expect.stringMatching(/ - dev\)$/),
    });
    expect(explorerNodes("en")[0].label).toMatchObject({
      visitor: expect.stringMatching(/ - visitor\)$/),
    });
  });

  it("links each object to the page in the same language", () => {
    expect(leaves(nodes).map((node) => node.href)).toEqual(
      CATALOG.map((object) => `/${object.section}`),
    );
    expect(leaves(explorerNodes("en")).map((node) => node.href)).toEqual(
      CATALOG.map((object) => `/en/${object.section}`),
    );
  });

  it("nests tables and procedures under the Portfolio database", () => {
    expect(expandableIds(nodes)).toEqual([
      "server",
      "databases",
      "database",
      "tables",
      "programmability",
      "stored-procedures",
    ]);
  });
});

const tree: TreeNode[] = [
  {
    id: "server",
    label: "server",
    icon: "server",
    children: [
      {
        id: "tables",
        label: "Tables",
        icon: "folder",
        children: [
          { id: "about", label: "dbo.About", icon: "table" },
          { id: "career", label: "dbo.Career", icon: "table" },
        ],
      },
      { id: "empty", label: "Empty", icon: "folder", children: [] },
    ],
  },
];

const allOpen = new Set(expandableIds(tree));
const visible = visibleNodes(tree, allOpen);

describe("expandableIds", () => {
  it("lists only the nodes that have children", () => {
    expect(expandableIds(tree)).toEqual(["server", "tables"]);
  });
});

describe("visibleNodes", () => {
  it("lists expanded nodes in reading order", () => {
    expect(visible.map((node) => node.id)).toEqual([
      "server",
      "tables",
      "about",
      "career",
      "empty",
    ]);
  });

  it("hides the children of collapsed nodes", () => {
    const collapsed = visibleNodes(tree, new Set(["server"]));
    expect(collapsed.map((node) => node.id)).toEqual([
      "server",
      "tables",
      "empty",
    ]);
  });
});

describe("moveForKey", () => {
  it("moves focus up and down without wrapping", () => {
    expect(moveForKey("ArrowDown", visible, "tables")).toEqual({
      type: "focus",
      id: "about",
    });
    expect(moveForKey("ArrowUp", visible, "tables")).toEqual({
      type: "focus",
      id: "server",
    });
    expect(moveForKey("ArrowDown", visible, "empty")).toBeNull();
    expect(moveForKey("ArrowUp", visible, "server")).toBeNull();
  });

  it("jumps to the first and last visible nodes", () => {
    expect(moveForKey("Home", visible, "career")).toEqual({
      type: "focus",
      id: "server",
    });
    expect(moveForKey("End", visible, "server")).toEqual({
      type: "focus",
      id: "empty",
    });
  });

  it("expands, enters, collapses and climbs with the side arrows", () => {
    const closed = visibleNodes(tree, new Set(["server"]));
    expect(moveForKey("ArrowRight", closed, "tables")).toEqual({
      type: "toggle",
      id: "tables",
    });
    expect(moveForKey("ArrowRight", visible, "tables")).toEqual({
      type: "focus",
      id: "about",
    });
    expect(moveForKey("ArrowLeft", visible, "tables")).toEqual({
      type: "toggle",
      id: "tables",
    });
    expect(moveForKey("ArrowLeft", visible, "about")).toEqual({
      type: "focus",
      id: "tables",
    });
    const allClosed = visibleNodes(tree, new Set());
    expect(moveForKey("ArrowLeft", allClosed, "server")).toBeNull();
    expect(moveForKey("ArrowRight", visible, "about")).toBeNull();
  });

  it("toggles folders and activates leaves with Enter and Space", () => {
    expect(moveForKey("Enter", visible, "tables")).toEqual({
      type: "toggle",
      id: "tables",
    });
    expect(moveForKey(" ", visible, "about")).toEqual({
      type: "activate",
      id: "about",
    });
  });

  it("ignores other keys and unknown nodes", () => {
    expect(moveForKey("a", visible, "about")).toBeNull();
    expect(moveForKey("ArrowDown", visible, "missing")).toBeNull();
  });
});
