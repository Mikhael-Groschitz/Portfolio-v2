import type { Metadata } from "next";
import {
  HOME_PAGE,
  SITE_URL,
  openGraphLocales,
  pageDescription,
  pageTitle,
  titleTemplate,
} from "@/app/site-metadata";
import { CONNECTION_SCRIPT } from "@/components/connect/connection-runtime";
import { LanguageProvider } from "@/components/locale/language-context";
import { addressLocale } from "@/components/locale/page-locale";
import { MotionSync } from "@/components/preferences/motion-sync";
import { PREFERENCES_SCRIPT } from "@/components/preferences/preferences-runtime";
import { LAYOUT_SCRIPT } from "@/components/shell/layout-store";
import { getTexts } from "@/content";
import { LOCALES } from "@/content/locales";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ lang: locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await addressLocale();
  const texts = getTexts(locale);
  const { name } = texts.about;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: pageTitle(HOME_PAGE, texts),
      template: titleTemplate(texts),
    },
    description: pageDescription(HOME_PAGE, texts),
    keywords: texts.seo.keywords,
    authors: [{ name, url: SITE_URL }],
    creator: name,
    openGraph: {
      type: "website",
      siteName: name,
      ...openGraphLocales(locale),
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await addressLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: CONNECTION_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: LAYOUT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }} />
      </head>
      <body>
        <LanguageProvider locale={locale}>
          <MotionSync />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
