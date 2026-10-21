import { RANKING } from "@/game/balance";

const LOOKALIKES: Readonly<Record<string, string>> = {
  "0": "O",
  "1": "I",
  "3": "E",
  "4": "A",
  "5": "S",
  "7": "T",
  "8": "B",
  "@": "A",
  $: "S",
};

const BLOCKED: ReadonlySet<string> = new Set([
  "BCT",
  "BUC",
  "CRH",
  "CRL",
  "FDP",
  "FDS",
  "FOD",
  "KCT",
  "KRH",
  "KRL",
  "MRD",
  "PNC",
  "PQP",
  "PRR",
  "PTA",
  "PUT",
  "TNC",
  "VDA",
  "VSF",
  "VTC",
  "CUS",
  "CUZ",
  "PAU",
  "PIC",
  "PIK",
  "PNH",
  "XOT",
  "XTA",
  "ASS",
  "AZZ",
  "FCK",
  "FFS",
  "FML",
  "FUC",
  "FUK",
  "FUQ",
  "FUX",
  "SHT",
  "SUK",
  "WTF",
  "CNT",
  "COK",
  "CUM",
  "DCK",
  "DIK",
  "FAP",
  "JIZ",
  "SEX",
  "TIT",
  "WNK",
  "NUD",
  "PHB",
  "PRN",
  "XNX",
  "XVD",
  "XXX",
  "FAG",
  "FGT",
  "KIK",
  "KKK",
  "KMS",
  "KYS",
  "NGG",
  "NGR",
  "NIG",
  "NZI",
]);

export function normalizeName(name: string): string {
  return [
    ...name
      .normalize("NFD")
      .replace(/\p{Mn}/gu, "")
      .toUpperCase(),
  ]
    .map((letter) => LOOKALIKES[letter] ?? letter)
    .join("");
}

export function isAllowedName(name: string): boolean {
  const normalized = normalizeName(name);
  for (
    let start = 0;
    start + RANKING.nameLength <= normalized.length;
    start++
  ) {
    if (BLOCKED.has(normalized.slice(start, start + RANKING.nameLength))) {
      return false;
    }
  }
  return true;
}
