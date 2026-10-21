import { RANKING } from "@/game/balance";
import { type RankingEntry, isPlausibleTime, isValidName } from "./leaderboard";

export const BACKUP_FORMAT = "symphony-ranking";
export const BACKUP_VERSION = 1;

export interface BackupEntry {
  name: string;
  timeMs: number;
  createdAt: string;
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  entries: BackupEntry[];
}

export type BackupReading =
  { ok: true; entries: RankingEntry[] } | { ok: false; reason: string };

const BACKUP_KEYS = ["entries", "exportedAt", "format", "version"];
const ENTRY_KEYS = ["createdAt", "name", "timeMs"];

export function createBackup(
  entries: readonly RankingEntry[],
  exportedAt: Date,
): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    entries: entries.map(({ name, timeMs, createdAt }) => ({
      name,
      timeMs,
      createdAt: createdAt.toISOString(),
    })),
  };
}

function hasExactly(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join() === keys.join()
  );
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.toISOString() !== value
    ? null
    : date;
}

function refuse(reason: string): BackupReading {
  return { ok: false, reason };
}

export function readBackup(text: string, now: Date): BackupReading {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return refuse("O arquivo não é um JSON válido.");
  }
  if (!hasExactly(data, BACKUP_KEYS) || data.format !== BACKUP_FORMAT) {
    return refuse("O arquivo não é uma exportação do ranking.");
  }
  if (data.version !== BACKUP_VERSION) {
    return refuse(`A versão ${String(data.version)} não é suportada.`);
  }
  if (!parseDate(data.exportedAt) || !Array.isArray(data.entries)) {
    return refuse("O cabeçalho da exportação está incompleto.");
  }
  if (data.entries.length > RANKING.size) {
    return refuse(
      `A exportação tem ${data.entries.length} entradas, e o ranking guarda no máximo ${RANKING.size}.`,
    );
  }
  const entries: RankingEntry[] = [];
  for (const [index, item] of data.entries.entries()) {
    const line = index + 1;
    if (!hasExactly(item, ENTRY_KEYS)) {
      return refuse(`A entrada ${line} tem campos inesperados.`);
    }
    if (!isValidName(item.name)) {
      return refuse(`A entrada ${line} tem um nome inválido.`);
    }
    if (!isPlausibleTime(item.timeMs)) {
      return refuse(`A entrada ${line} tem um tempo fora da faixa aceita.`);
    }
    const createdAt = parseDate(item.createdAt);
    if (!createdAt || createdAt > now) {
      return refuse(`A entrada ${line} tem uma data inválida.`);
    }
    entries.push({ name: item.name, timeMs: item.timeMs, createdAt });
  }
  return { ok: true, entries };
}
