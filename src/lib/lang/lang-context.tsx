import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Lang } from "./translations";

// ─────────────────────────────────────────────────────────────────────────────
// Context types
// ─────────────────────────────────────────────────────────────────────────────
interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "ponmani_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "ta" || stored === "en") return stored;
    } catch {}
    return "en";
  });

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }

  // Apply lang attribute + font class to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", lang === "ta" ? "ta" : "en");
    if (lang === "ta") {
      html.classList.add("lang-ta");
    } else {
      html.classList.remove("lang-ta");
    }
  }, [lang]);

  function t(key: string, fallback?: string): string {
    return translations[lang][key] ?? translations["en"][key] ?? fallback ?? key;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the full context (lang, setLang, t) */
export function useLang() {
  return useContext(LangContext);
}

/** Returns only the translator function — convenience shorthand */
export function useT() {
  return useContext(LangContext).t;
}
