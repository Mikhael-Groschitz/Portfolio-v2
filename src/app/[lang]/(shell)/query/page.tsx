import type { Metadata } from "next";
import { pageMetadata } from "@/app/site-metadata";
import { QueryEditor } from "@/components/editor/query-editor";
import { pageLocale, pageTexts } from "@/components/locale/page-locale";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...pageMetadata("query", await pageLocale()),
    robots: { index: false },
  };
}

export default async function QueryPage() {
  const { shell } = await pageTexts();
  return <QueryEditor text={shell.query} />;
}
