import { localizedPath } from "@/components/locale/locale-routing";
import { addressLocale } from "@/components/locale/page-locale";
import { errorLines } from "@/components/results/messages";
import { getTexts } from "@/content";
import { ANOTHER_CASTLE, ERROR_LEVEL, ERROR_STATE } from "@/engine/errors";

export default async function NotFound() {
  const locale = await addressLocale();
  const { about, shell } = getTexts(locale);
  const message = errorLines(
    {
      number: ANOTHER_CASTLE.code,
      level: ERROR_LEVEL,
      state: ERROR_STATE,
      line: 1,
      message: ANOTHER_CASTLE.text[locale],
    },
    shell.results,
  );

  return (
    <main className="not-found">
      <title>{`${shell.notFound.title} | ${about.name}`}</title>
      <h1 className="not-found-title">{shell.notFound.title}</h1>
      <pre className="not-found-message">{message}</pre>
      <a href={localizedPath("/", locale)}>{shell.notFound.back}</a>
    </main>
  );
}
