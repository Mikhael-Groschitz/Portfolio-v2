function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatRankingTime(milliseconds: number): string {
  const whole = Math.max(0, Math.floor(milliseconds));
  const minutes = Math.floor(whole / 60_000);
  const seconds = Math.floor((whole % 60_000) / 1000);
  const hundredths = Math.floor((whole % 1000) / 10);
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
}
