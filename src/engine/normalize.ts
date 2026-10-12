export interface Statement {
  text: string;
  line: number;
  original: string;
}

interface Token {
  text: string;
  raw: string;
  line: number;
}

const STATEMENT_STARTERS = new Set([
  "select",
  "exec",
  "execute",
  "use",
  "help",
]);
const STATEMENT_END = ";";
const BATCH_SEPARATOR = "go";

const PART = String.raw`(?:\[[^\]\n]*\]|[\p{L}\p{N}_@#$]+)`;

const SKIPPED = [/\s+/uy, /--[^\n]*/uy, /\/\*[\s\S]*?(?:\*\/|$)/uy];
const NAME = new RegExp(`${PART}(?:\\.${PART})*`, "uy");
const STRING = /N?'(?:[^']|'')*(?:'|$)/iuy;
const SYMBOL = /[^\s]/uy;

function matchAt(pattern: RegExp, input: string, index: number): string | null {
  pattern.lastIndex = index;
  return pattern.exec(input)?.[0] ?? null;
}

function countLines(text: string): number {
  return text.split("\n").length - 1;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  while (index < input.length) {
    const skipped = SKIPPED.map((pattern) =>
      matchAt(pattern, input, index),
    ).find((match) => match !== null);
    if (skipped) {
      index += skipped.length;
      line += countLines(skipped);
      continue;
    }
    const name = matchAt(NAME, input, index);
    const raw =
      matchAt(STRING, input, index) ?? name ?? matchAt(SYMBOL, input, index);
    if (!raw) {
      break;
    }
    const text = raw === name ? raw.replace(/[[\]]/g, "") : raw;
    tokens.push({ text: text.toLowerCase(), raw, line });
    index += raw.length;
    line += countLines(raw);
  }
  return tokens;
}

export function splitStatements(input: string): Statement[] {
  const statements: Statement[] = [];
  let current: Token[] = [];

  function flush() {
    if (current.length > 0) {
      statements.push({
        text: current.map((token) => token.text).join(" "),
        line: current[0].line,
        original: current.map((token) => token.raw).join(" "),
      });
      current = [];
    }
  }

  for (const token of tokenize(input)) {
    if (token.text === STATEMENT_END || token.text === BATCH_SEPARATOR) {
      flush();
    } else {
      if (STATEMENT_STARTERS.has(token.text)) {
        flush();
      }
      current.push(token);
    }
  }
  flush();
  return statements;
}

export function normalizeStatement(text: string): string {
  return splitStatements(text)[0]?.text ?? "";
}
