import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { createPrismaClient } from "../src/server/db/client";
import { cliDatabaseUrl, loadEnvironment } from "../src/server/env";
import {
  type CliIo,
  planCommand,
  planMigrate,
  runCommand,
} from "../src/server/ranking/cli";
import { createPrismaStore } from "../src/server/ranking/prisma-store";
import { scrub, targetLabel } from "../src/server/ranking/target";

const io: CliIo = {
  print: (line) => console.log(line),
  readFile: (path) => readFileSync(resolve(path), "utf8"),
  write(path, contents) {
    const full = resolve(path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents);
    return path;
  },
  now: () => new Date(),
};

function migrate(extra: readonly string[]): number {
  const cli = createRequire(join(process.cwd(), "package.json")).resolve(
    "prisma/build/index.js",
  );
  const result = spawnSync(
    process.execPath,
    [cli, "migrate", "dev", ...extra],
    { stdio: "inherit" },
  );
  return result.status ?? 1;
}

async function main(args: readonly string[]): Promise<number> {
  let url = "";
  try {
    loadEnvironment();
    url = cliDatabaseUrl(process.env);
    if (args[0] === "migrate") {
      const plan = planMigrate(args.slice(1), url);
      if (!plan.ok) {
        console.error(plan.reason);
        return 1;
      }
      console.log(`Alvo: ${plan.target.masked} (${targetLabel(plan.target)})`);
      return migrate(plan.extra);
    }
    const plan = planCommand(args, url);
    if (!plan.ok) {
      console.error(plan.reason);
      return 1;
    }
    console.log(`Alvo: ${plan.target.masked} (${targetLabel(plan.target)})`);
    const store = createPrismaStore(createPrismaClient(url, { max: 1 }));
    try {
      return await runCommand(plan, store, io);
    } finally {
      await store.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Não deu certo: ${scrub(message, url)}`);
    return 1;
  }
}

void main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
