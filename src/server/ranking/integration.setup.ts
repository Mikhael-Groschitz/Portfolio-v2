import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { loadEnvironment } from "../env";
import { integrationTarget, targetLabel } from "./target";

export default function setup(): void {
  loadEnvironment();
  const check = integrationTarget(process.env);
  if (!check.ok) {
    throw new Error(check.reason);
  }
  console.info(
    `Testes de integração em ${check.target.masked} (${targetLabel(check.target)}). As tabelas desse banco serão esvaziadas.`,
  );
  if (check.target.kind !== "local") {
    return;
  }
  const cli = createRequire(join(process.cwd(), "package.json")).resolve(
    "prisma/build/index.js",
  );
  const result = spawnSync(process.execPath, [cli, "migrate", "deploy"], {
    env: { ...process.env, DIRECT_URL: check.url, DATABASE_URL: check.url },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Não consegui aplicar as migrações no banco de teste.");
  }
}
