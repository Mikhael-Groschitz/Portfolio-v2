import { parseArgs } from "node:util";
import { createBackup, readBackup } from "@/ranking/backup";
import { formatRankingTime } from "@/ranking/format";
import type { StoredEntry } from "@/ranking/leaderboard";
import { isAllowedName } from "./names";
import { type LeaderboardStore, RestoreRefused } from "./store";
import { type Target, describeTarget } from "./target";

export const COMMANDS = [
  "list",
  "export",
  "remove",
  "reset",
  "import",
  "purge",
] as const;

export type Command = (typeof COMMANDS)[number];

export const BACKUP_DIR = "ranking-backups";

export interface Flags {
  apply: boolean;
  remote: boolean;
  replace: boolean;
  out: string | null;
}

export type Plan =
  | {
      ok: true;
      command: Command;
      argument: string | null;
      flags: Flags;
      target: Target;
    }
  | { ok: false; reason: string };

export type ReadyPlan = Extract<Plan, { ok: true }>;

export type MigratePlan =
  { ok: true; target: Target; extra: string[] } | { ok: false; reason: string };

export interface CliIo {
  print(line: string): void;
  readFile(path: string): string;
  write(path: string, contents: string): string;
  now(): Date;
}

const NO_DATABASE =
  "Nenhum banco configurado. Defina DATABASE_URL (ou DIRECT_URL) no .env.local ou no arquivo apontado por ENV_FILE.";

function refuse(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function isCommand(value: string | undefined): value is Command {
  return (COMMANDS as readonly (string | undefined)[]).includes(value);
}

function checkTarget(url: string): Target | string {
  if (!url) {
    return NO_DATABASE;
  }
  const target = describeTarget(url);
  return target.kind === "invalid"
    ? `O endereço do banco não é um endereço PostgreSQL válido: ${target.masked}`
    : target;
}

export function planMigrate(args: readonly string[], url: string): MigratePlan {
  const target = checkTarget(url);
  if (typeof target === "string") {
    return refuse(target);
  }
  if (target.kind !== "local") {
    return refuse(
      `O db:migrate só roda no banco local do Docker, e o alvo é ${target.masked}. Para bancos remotos, use npm run db:deploy.`,
    );
  }
  return { ok: true, target, extra: [...args] };
}

export function planCommand(args: readonly string[], url: string): Plan {
  const [command, ...rest] = args;
  if (!isCommand(command)) {
    return refuse(
      `Comando desconhecido: ${command ?? "(nenhum)"}. Use ${COMMANDS.join(", ")}.`,
    );
  }
  let parsed;
  try {
    parsed = parseArgs({
      args: rest,
      allowPositionals: true,
      strict: true,
      options: {
        apply: { type: "boolean", default: false },
        remote: { type: "boolean", default: false },
        replace: { type: "boolean", default: false },
        out: { type: "string" },
      },
    });
  } catch (error) {
    return refuse(
      `Opção inválida: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const { values, positionals } = parsed;
  const flags: Flags = {
    apply: values.apply,
    remote: values.remote,
    replace: values.replace,
    out: values.out ?? null,
  };
  const wanted = command === "remove" || command === "import" ? 1 : 0;
  if (positionals.length !== wanted) {
    return refuse(
      command === "remove"
        ? "Informe o id da entrada: remove <id>."
        : command === "import"
          ? "Informe o arquivo: import <arquivo>."
          : `O comando ${command} não recebe argumentos.`,
    );
  }
  const argument = positionals[0] ?? null;
  if (command === "remove" && !/^[1-9]\d{0,9}$/.test(argument ?? "")) {
    return refuse("O id precisa ser um número inteiro positivo.");
  }
  if (flags.replace && command !== "import") {
    return refuse("A opção --replace só vale para o import.");
  }
  if (flags.out !== null && command !== "export") {
    return refuse("A opção --out só vale para o export.");
  }
  const target = checkTarget(url);
  if (typeof target === "string") {
    return refuse(target);
  }
  if (target.kind === "remote" && !flags.remote) {
    return refuse(
      `O alvo é REMOTO (${target.masked}). Repita com --remote para confirmar. Nenhuma conexão foi feita.`,
    );
  }
  return { ok: true, command, argument, flags, target };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatStamp(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function backupPath(command: string, date: Date): string {
  const stamp = formatStamp(date).replace(/[-:]/g, "").replace(" ", "-");
  return `${BACKUP_DIR}/${command}-${stamp}.json`;
}

function entryLine(position: number, entry: StoredEntry): string {
  return [
    String(position).padStart(3),
    String(entry.id).padStart(6),
    `  ${entry.name.padEnd(4)}`,
    `  ${formatRankingTime(entry.timeMs)}`,
    `  ${formatStamp(entry.createdAt)}`,
  ].join("");
}

const HEADER = [
  "Pos",
  "Id".padStart(6),
  `  ${"Nome".padEnd(4)}`,
  `  ${"Tempo".padEnd(8)}`,
  "  Data",
].join("");

function dryRun(io: CliIo, action: string): number {
  io.print(`Simulação: ${action}. Rode de novo com --apply para executar.`);
  return 0;
}

async function backup(
  store: LeaderboardStore,
  io: CliIo,
  command: string,
): Promise<string> {
  const rows = await store.list();
  return io.write(
    backupPath(command, io.now()),
    `${JSON.stringify(createBackup(rows, io.now()), null, 2)}\n`,
  );
}

export async function runCommand(
  plan: ReadyPlan,
  store: LeaderboardStore,
  io: CliIo,
): Promise<number> {
  const { command, argument, flags } = plan;
  if (command === "list") {
    const rows = await store.list();
    const counts = await store.counts();
    if (rows.length === 0) {
      io.print("O ranking está vazio.");
    } else {
      io.print(HEADER);
      rows.forEach((entry, index) => io.print(entryLine(index + 1, entry)));
    }
    io.print(
      `Linhas: leaderboard_entry ${counts.entries} · used_token ${counts.usedTokens} · rate_limit ${counts.rateLimits}`,
    );
    return 0;
  }
  if (command === "export") {
    const rows = await store.list();
    const path = io.write(
      flags.out ?? backupPath("export", io.now()),
      `${JSON.stringify(createBackup(rows, io.now()), null, 2)}\n`,
    );
    io.print(`Exportei ${rows.length} entradas para ${path}.`);
    return 0;
  }
  if (command === "remove") {
    const id = Number(argument);
    const rows = await store.list();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) {
      io.print(`Nenhuma entrada com id ${id}.`);
      return 1;
    }
    io.print(HEADER);
    io.print(entryLine(index + 1, rows[index]));
    if (!flags.apply) {
      return dryRun(
        io,
        "removeria essa entrada, com um export automático antes",
      );
    }
    const path = await backup(store, io, "remove");
    await store.remove(id);
    io.print(`Backup em ${path}. Entrada ${id} removida.`);
    return 0;
  }
  if (command === "reset") {
    const rows = await store.list();
    if (!flags.apply) {
      return dryRun(
        io,
        `apagaria as ${rows.length} entradas do ranking, com um export automático antes`,
      );
    }
    const path = await backup(store, io, "reset");
    const removed = await store.clear();
    io.print(`Backup em ${path}. ${removed} entradas apagadas.`);
    return 0;
  }
  if (command === "import") {
    let text: string;
    try {
      text = io.readFile(argument ?? "");
    } catch {
      io.print(`Não consegui ler o arquivo ${argument}.`);
      return 1;
    }
    const reading = readBackup(text, io.now());
    if (!reading.ok) {
      io.print(reading.reason);
      return 1;
    }
    const refused = reading.entries.findIndex(
      ({ name }) => !isAllowedName(name),
    );
    if (refused >= 0) {
      io.print(`A entrada ${refused + 1} tem um nome recusado pelo filtro.`);
      return 1;
    }
    const { entries } = await store.counts();
    if (entries > 0 && !flags.replace) {
      io.print(new RestoreRefused(entries).message);
      return 1;
    }
    if (!flags.apply) {
      return dryRun(
        io,
        `importaria ${reading.entries.length} entradas${entries > 0 ? `, substituindo as ${entries} atuais (com um export automático antes)` : ""}`,
      );
    }
    const path = entries > 0 ? await backup(store, io, "import") : null;
    try {
      const restored = await store.restore(reading.entries, flags.replace);
      io.print(
        `${path ? `Backup em ${path}. ` : ""}${restored} entradas importadas.`,
      );
      return 0;
    } catch (error) {
      if (error instanceof RestoreRefused) {
        io.print(error.message);
        return 1;
      }
      throw error;
    }
  }
  const expired = await store.expired();
  if (!flags.apply) {
    return dryRun(
      io,
      `apagaria ${expired.usedTokens} tokens usados e ${expired.rateLimits} contadores de IP já vencidos`,
    );
  }
  const purged = await store.purge();
  io.print(
    `Apaguei ${purged.usedTokens} tokens usados e ${purged.rateLimits} contadores de IP vencidos.`,
  );
  return 0;
}
