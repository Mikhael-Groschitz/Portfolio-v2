import { describe, expect, it } from "vitest";
import { RANKING } from "@/game/balance";
import { createBackup } from "@/ranking/backup";
import {
  type CliIo,
  type ReadyPlan,
  backupPath,
  planCommand,
  planMigrate,
  runCommand,
} from "./cli";
import { createMemoryStore } from "./memory-store";
import type { LeaderboardStore } from "./store";
import { fill } from "./store-contract";

const LOCAL = "postgresql://ranking:ranking@127.0.0.1:5433/ranking";
const REMOTE = "postgresql://user:pass@db.example.com:5432/postgres";
const NOW = new Date(2026, 9, 20, 18, 30, 5);

function ready(args: string[], url = LOCAL): ReadyPlan {
  const plan = planCommand(args, url);
  if (!plan.ok) {
    throw new Error(plan.reason);
  }
  return plan;
}

function harness(files: Record<string, string> = {}) {
  const printed: string[] = [];
  const written = new Map<string, string>();
  const io: CliIo = {
    print: (line) => printed.push(line),
    readFile(path) {
      if (!(path in files)) {
        throw new Error("missing");
      }
      return files[path];
    },
    write(path, contents) {
      written.set(path, contents);
      return path;
    },
    now: () => NOW,
  };
  return { io, printed, written };
}

async function run(store: LeaderboardStore, args: string[], files = {}) {
  const tools = harness(files);
  const code = await runCommand(ready(args), store, tools.io);
  return { code, ...tools };
}

describe("CLI guards", () => {
  it("refuses unknown commands and wrong arguments before anything else", () => {
    expect(planCommand([], LOCAL)).toMatchObject({ ok: false });
    expect(planCommand(["drop"], LOCAL)).toMatchObject({ ok: false });
    expect(planCommand(["remove"], LOCAL)).toMatchObject({ ok: false });
    expect(planCommand(["remove", "abc"], LOCAL)).toMatchObject({ ok: false });
    expect(planCommand(["remove", "0"], LOCAL)).toMatchObject({ ok: false });
    expect(planCommand(["import"], LOCAL)).toMatchObject({ ok: false });
    expect(planCommand(["list", "extra"], LOCAL)).toMatchObject({ ok: false });
    expect(planCommand(["reset", "--force"], LOCAL)).toMatchObject({
      ok: false,
    });
    expect(planCommand(["reset", "--replace"], LOCAL)).toMatchObject({
      ok: false,
    });
    expect(planCommand(["list", "--out", "x.json"], LOCAL)).toMatchObject({
      ok: false,
    });
  });

  it("refuses when no database is configured", () => {
    expect(planCommand(["list"], "")).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/Nenhum banco/),
    });
    expect(planCommand(["list"], "mysql://x")).toMatchObject({ ok: false });
  });

  it("asks for --remote on any remote target, without connecting", () => {
    for (const args of [
      ["list"],
      ["reset", "--apply"],
      ["remove", "3", "--apply"],
    ]) {
      const plan = planCommand(args, REMOTE);
      expect(plan).toMatchObject({
        ok: false,
        reason: expect.stringMatching(/--remote.*Nenhuma conexão/),
      });
      expect(JSON.stringify(plan)).not.toContain("pass@");
    }
    expect(planCommand(["reset", "--apply", "--remote"], REMOTE)).toMatchObject(
      {
        ok: true,
        target: { kind: "remote" },
      },
    );
  });

  it("simulates unless --apply is given", () => {
    expect(ready(["reset"]).flags.apply).toBe(false);
    expect(ready(["reset", "--apply"]).flags.apply).toBe(true);
  });

  it("lets db:migrate run only on the local Docker database", () => {
    expect(planMigrate(["--name", "init"], LOCAL)).toMatchObject({
      ok: true,
      extra: ["--name", "init"],
    });
    expect(planMigrate([], REMOTE)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/db:deploy/),
    });
    expect(
      planMigrate([], "postgresql://postgres:x@127.0.0.1:5432/ranking"),
    ).toMatchObject({ ok: false });
    expect(planMigrate([], "")).toMatchObject({ ok: false });
  });

  it("names automatic backups with the command and the moment", () => {
    expect(backupPath("reset", NOW)).toBe(
      "ranking-backups/reset-20261020-183005.json",
    );
  });
});

describe("CLI commands", () => {
  it("lists positions, ids, names, times and table counts", async () => {
    const store = createMemoryStore(() => NOW);
    await fill(store, [343_250, 301_000]);
    const { code, printed } = await run(store, ["list"]);
    expect(code).toBe(0);
    expect(printed[1]).toMatch(
      /^\s+1\s+2\s+AAA\s+05:01\.00\s+2026-10-20 18:30:05$/,
    );
    expect(printed[2]).toMatch(/^\s+2\s+1\s+AAA\s+05:43\.25/);
    expect(printed.at(-1)).toBe(
      "Linhas: leaderboard_entry 2 · used_token 2 · rate_limit 0",
    );
  });

  it("says when the ranking is empty", async () => {
    const { printed } = await run(createMemoryStore(), ["list"]);
    expect(printed[0]).toBe("O ranking está vazio.");
  });

  it("exports to the backups folder or to --out", async () => {
    const store = createMemoryStore(() => NOW);
    await fill(store, [343_250]);
    const first = await run(store, ["export"]);
    expect([...first.written.keys()]).toEqual([
      "ranking-backups/export-20261020-183005.json",
    ]);
    const second = await run(store, ["export", "--out", "copia.json"]);
    expect(JSON.parse(second.written.get("copia.json") ?? "")).toMatchObject({
      format: "symphony-ranking",
      entries: [{ name: "AAA", timeMs: 343_250 }],
    });
  });

  it("only simulates a removal without --apply", async () => {
    const store = createMemoryStore();
    await fill(store, [343_250]);
    const { code, printed, written } = await run(store, ["remove", "1"]);
    expect(code).toBe(0);
    expect(printed.at(-1)).toMatch(/^Simulação/);
    expect(written.size).toBe(0);
    expect(await store.list()).toHaveLength(1);
  });

  it("backs up before removing or resetting with --apply", async () => {
    const store = createMemoryStore(() => NOW);
    await fill(store, [343_250, 301_000, 310_000]);
    const removal = await run(store, ["remove", "2", "--apply"]);
    expect(
      removal.written.has("ranking-backups/remove-20261020-183005.json"),
    ).toBe(true);
    expect((await store.list()).map(({ id }) => id)).toEqual([3, 1]);
    const reset = await run(store, ["reset", "--apply"]);
    const saved = JSON.parse(
      reset.written.get("ranking-backups/reset-20261020-183005.json") ?? "",
    );
    expect(saved.entries).toHaveLength(2);
    expect(await store.list()).toEqual([]);
  });

  it("fails on an id that does not exist", async () => {
    const { code } = await run(createMemoryStore(), ["remove", "9", "--apply"]);
    expect(code).toBe(1);
  });

  it("imports a valid export, refusing to mix without --replace", async () => {
    const file = JSON.stringify(
      createBackup(
        [{ name: "MGC", timeMs: 343_250, createdAt: new Date(2026, 9, 14) }],
        NOW,
      ),
    );
    const store = createMemoryStore();
    const simulated = await run(store, ["import", "dump.json"], {
      "dump.json": file,
    });
    expect(simulated.printed.at(-1)).toMatch(
      /^Simulação: importaria 1 entradas/,
    );
    expect(await store.list()).toEqual([]);
    expect(
      (
        await run(store, ["import", "dump.json", "--apply"], {
          "dump.json": file,
        })
      ).code,
    ).toBe(0);
    expect((await store.list()).map(({ name }) => name)).toEqual(["MGC"]);
    const mixed = await run(store, ["import", "dump.json", "--apply"], {
      "dump.json": file,
    });
    expect(mixed.code).toBe(1);
    const replaced = await run(
      store,
      ["import", "dump.json", "--apply", "--replace"],
      { "dump.json": file },
    );
    expect(replaced.code).toBe(0);
    expect(replaced.written.size).toBe(1);
  });

  it("refuses an import that the game would refuse", async () => {
    const bad = JSON.stringify({
      ...createBackup([], NOW),
      entries: [{ name: "x", timeMs: 1, createdAt: NOW.toISOString() }],
    });
    const { code, printed } = await run(
      createMemoryStore(),
      ["import", "bad.json", "--apply"],
      { "bad.json": bad },
    );
    expect(code).toBe(1);
    expect(printed.at(-1)).toMatch(/nome inválido/);
    const missing = await run(createMemoryStore(), ["import", "nowhere.json"]);
    expect(missing.code).toBe(1);
  });

  it("refuses an import with a name the filter blocks", async () => {
    const file = JSON.stringify(
      createBackup(
        [{ name: "FDP", timeMs: 343_250, createdAt: new Date(2026, 9, 14) }],
        NOW,
      ),
    );
    const store = createMemoryStore();
    const { code, printed } = await run(
      store,
      ["import", "dump.json", "--apply"],
      {
        "dump.json": file,
      },
    );
    expect(code).toBe(1);
    expect(printed.at(-1)).toMatch(/recusado pelo filtro/);
    expect(await store.list()).toEqual([]);
  });

  it("purges expired rows only with --apply", async () => {
    let now = Date.now();
    const store = createMemoryStore(() => new Date(now));
    await store.hit("ip", 1_000);
    now += 5_000;
    const simulated = await run(store, ["purge"]);
    expect(simulated.printed.at(-1)).toMatch(/1 contadores de IP/);
    expect((await store.counts()).rateLimits).toBe(1);
    await run(store, ["purge", "--apply"]);
    expect((await store.counts()).rateLimits).toBe(0);
  });

  it("never prints more than the ranking keeps after normal use", async () => {
    const store = createMemoryStore();
    await fill(
      store,
      Array.from({ length: RANKING.size + 3 }, (_, index) => 200_000 + index),
    );
    const { printed } = await run(store, ["list"]);
    expect(printed).toHaveLength(RANKING.size + 2);
  });
});
