"use client";

import { useLanguage } from "./language-context";
import { nextLocale } from "./locale-routing";
import styles from "./language-toggle.module.css";

interface LanguageToggleProps {
  label: string;
  className?: string;
}

export function LanguageToggle({
  label,
  className = styles.toggle,
}: Readonly<LanguageToggleProps>) {
  const { locale, setLocale } = useLanguage();
  const target = nextLocale(locale);

  return (
    <button
      type="button"
      className={className}
      data-language-toggle=""
      onClick={() => setLocale(target)}
    >
      <span lang={target}>{label}</span>
    </button>
  );
}
