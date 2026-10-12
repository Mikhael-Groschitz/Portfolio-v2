import type { Locale } from "./locales";
import type { CountText, YearMonth } from "./types";

export function formatYearMonth(value: YearMonth, locale: Locale): string {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(year, month - 1));
}

export function formatCount(text: CountText, count: number): string {
  const template = count === 1 ? text.one : text.other;
  return template.replace("{count}", String(count));
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

export function formatCompletionTime(
  date: Date,
  offsetMinutes = -date.getTimezoneOffset(),
): string {
  const local = new Date(date.getTime() + offsetMinutes * 60_000);
  const day = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  const time = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
  const fraction = `${pad(local.getUTCMilliseconds(), 3)}0000`;
  const sign = offsetMinutes < 0 ? "-" : "+";
  const offset = Math.abs(offsetMinutes);
  return `${day}T${time}.${fraction}${sign}${pad(Math.floor(offset / 60))}:${pad(offset % 60)}`;
}

export function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return [seconds / 3600, (seconds % 3600) / 60, seconds % 60]
    .map((part) => pad(Math.floor(part)))
    .join(":");
}

export function formatDuration(milliseconds: number): string {
  const whole = Math.max(0, Math.round(milliseconds));
  return `${formatElapsed(whole)}.${pad(whole % 1000, 3)}`;
}
