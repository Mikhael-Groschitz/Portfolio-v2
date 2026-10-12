"use client";

import { LOCALES, type Localized } from "@/content/locales";
import { useLanguage } from "./language-context";
import { nextLocale } from "./locale-runtime";
import styles from "./language-toggle.module.css";

interface LanguageToggleProps {
  labels: Localized;
  className?: string;
}

export function LanguageToggle({
  labels,
  className = styles.toggle,
}: Readonly<LanguageToggleProps>) {
  const { locale, setLocale } = useLanguage();

  return (
    <button
      type="button"
      className={className}
      data-language-toggle=""
      onClick={() => setLocale(nextLocale(locale))}
    >
      {LOCALES.map((option) => (
        <span key={option} lang={nextLocale(option)} data-locale-block={option}>
          {labels[option]}
        </span>
      ))}
    </button>
  );
}
