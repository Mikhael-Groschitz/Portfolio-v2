import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { highlightTsql } from "@/components/editor/highlight";
import { pageLocale } from "@/components/locale/page-locale";
import { DEFAULT_LOCALE } from "@/content/locales";
import { catalogIdentifiers } from "@/engine/catalog";
import { contrastRatio } from "@/theme/contrast";
import {
  CONTRAST_PAIRS,
  TOKEN_GROUPS,
  type TokenGroup,
  parseTokens,
} from "@/theme/tokens";
import styles from "./palette.module.css";

export const metadata: Metadata = {
  title: "Paleta de cores",
  robots: { index: false, follow: false },
};

const GROUP_LABELS: Record<TokenGroup, string> = {
  structure: "Estrutura",
  bars: "Barras",
  grid: "Grade de resultados",
  messages: "Mensagens",
  intellisense: "IntelliSense",
  syntax: "Sintaxe",
  extra: "Extras exigidos pelos prints",
  easterEggs: "Easter eggs",
};

const SAMPLE_SQL = `-- Oi! Este trecho existe só para comparar as cores com os prints do SSMS.
USE Portfolio;
GO

DECLARE @Since DATE = '2020-01-01';

/* Carreira a partir de uma data */
SELECT Company, UPPER(LTRIM(Role)) AS Title, COUNT(*) AS Total
FROM dbo.Career
WHERE StartDate >= @Since AND EndDate IS NULL
GROUP BY Company, Role
ORDER BY Total DESC;

EXEC dbo.sp_DownloadCV @Language = N'pt-BR', @Retries = 3;`;

const tokenValues = parseTokens(
  readFileSync(path.join(process.cwd(), "src/theme/tokens.css"), "utf8"),
);
const sqlLines = highlightTsql(SAMPLE_SQL, catalogIdentifiers());

const ratioFormat = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function hexOf(name: string): string {
  return tokenValues.get(name) ?? "";
}

export default async function PalettePage() {
  if ((await pageLocale()) !== DEFAULT_LOCALE) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <h1>Paleta de cores</h1>
      <p className={styles.intro}>
        Estes são os tokens de cor medidos nos prints do SSMS 21 em tema escuro.
        Dá para abrir esta página ao lado do{" "}
        <code>ssms21-dark-editor.jpeg</code> e comparar com calma.
      </p>

      <section aria-labelledby="tokens-title">
        <h2 id="tokens-title">Tokens</h2>
        {(Object.keys(TOKEN_GROUPS) as TokenGroup[]).map((group) => (
          <div key={group} className={styles.group}>
            <h3>{GROUP_LABELS[group]}</h3>
            <ul className={styles.swatches}>
              {TOKEN_GROUPS[group].map((name) => (
                <li key={name} className={styles.swatch}>
                  <span
                    className={styles.chip}
                    style={{ background: `var(--${name})` }}
                    aria-hidden="true"
                  />
                  <span>
                    <span className={styles.name}>--{name}</span>
                    <br />
                    <span className={styles.hex}>{hexOf(name)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="contrast-title" className={styles.group}>
        <h2 id="contrast-title">Contraste (WCAG AA)</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.caption}>
              Mínimo de 4,5:1 para texto e 3:1 para indicadores de interface.
            </caption>
            <thead>
              <tr>
                <th scope="col">Cor</th>
                <th scope="col">Fundo</th>
                <th scope="col">Amostra</th>
                <th scope="col">Razão</th>
                <th scope="col">Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {CONTRAST_PAIRS.map(({ fg, bg, min }) => (
                <tr key={`${fg}-${bg}`}>
                  <td className={styles.name}>--{fg}</td>
                  <td className={styles.name}>--{bg}</td>
                  <td>
                    <span
                      className={styles.sample}
                      style={{
                        color: `var(--${fg})`,
                        background: `var(--${bg})`,
                      }}
                    >
                      Aa 123
                    </span>
                  </td>
                  <td>
                    {ratioFormat.format(contrastRatio(hexOf(fg), hexOf(bg)))}:1
                  </td>
                  <td>{ratioFormat.format(min)}:1</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="sql-title" className={styles.group}>
        <h2 id="sql-title">Trecho de T-SQL</h2>
        <pre className={styles.code}>
          <code>
            {sqlLines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} style={{ color: token.color }}>
                    {token.content}
                  </span>
                ))}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      </section>
    </main>
  );
}
