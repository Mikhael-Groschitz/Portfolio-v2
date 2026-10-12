import { type HighlighterCore, createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import sql from "shiki/langs/sql.mjs";
import { ssmsDarkTheme } from "@/theme/shiki-theme";

export interface CodeToken {
  content: string;
  color?: string;
}

type CodeLine = readonly CodeToken[];

const IDENTIFIER_COLOR = "var(--syntax-variable)";
const OPERATOR_COLOR = "var(--syntax-operator)";
const LITERAL_COLORS = new Set([
  "var(--syntax-comment)",
  "var(--syntax-string)",
]);
const LOGICAL_OPERATORS = new Set([
  "ALL",
  "AND",
  "ANY",
  "BETWEEN",
  "EXISTS",
  "IN",
  "IS",
  "LIKE",
  "NOT",
  "NULL",
  "OR",
  "SOME",
]);
const PIECES = /\s+|[,;.()]|[^\s,;.()]+/g;
const PUNCTUATION = /^[,;.()]$/;

let highlighter: HighlighterCore | null = null;

function pieceColor(
  piece: string,
  color: string | undefined,
  identifiers: ReadonlySet<string>,
): string | undefined {
  if (PUNCTUATION.test(piece)) {
    return OPERATOR_COLOR;
  }
  if (identifiers.has(piece)) {
    return IDENTIFIER_COLOR;
  }
  if (LOGICAL_OPERATORS.has(piece.toUpperCase())) {
    return OPERATOR_COLOR;
  }
  return color;
}

function retint(line: CodeLine, identifiers: ReadonlySet<string>): CodeToken[] {
  return line.flatMap((token) => {
    if (token.color && LITERAL_COLORS.has(token.color)) {
      return [token];
    }
    return (token.content.match(PIECES) ?? []).map((piece) => ({
      content: piece,
      color: pieceColor(piece, token.color, identifiers),
    }));
  });
}

function sqlHighlighter(): HighlighterCore {
  highlighter ??= createHighlighterCoreSync({
    themes: [ssmsDarkTheme],
    langs: [sql],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

export function highlightTsql(
  code: string,
  identifiers: ReadonlySet<string>,
): CodeToken[][] {
  const { tokens } = sqlHighlighter().codeToTokens(code, {
    lang: "sql",
    theme: ssmsDarkTheme,
  });
  return tokens.map((line) =>
    retint(
      line.map(({ content, color }) => ({ content, color })),
      identifiers,
    ),
  );
}
