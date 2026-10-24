import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { browserLang, type Lang, LANG_NAMES, LangProvider, localizedPath, saveLang, savedLang, stripLang } from "./index";

// Once per visit: a guest who picked a language before and lands on an
// English page (a shared link, a search result in English) is taken to the
// same page in their language. Links in another language's URL are kept as
// they are, and crawlers never have a saved choice.
let preferenceChecked = false;

const SUGGESTION: Record<Lang, { text: string; switchTo: string; dismiss: string }> = {
  en: { text: "This page is also in English.", switchTo: "Show in English", dismiss: "No thanks" },
  sv: { text: "Sidan finns på svenska.", switchTo: "Visa på svenska", dismiss: "Nej tack" },
  de: { text: "Diese Seite gibt es auch auf Deutsch.", switchTo: "Auf Deutsch anzeigen", dismiss: "Nein danke" },
};

/** The guest site in one language: sets the page language for everything below it */
export function LangLayout({ lang }: { lang: Lang }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [suggest, setSuggest] = useState<Lang | null>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (preferenceChecked) return;
    preferenceChecked = true;
    const saved = savedLang();
    const target = `${localizedPath(stripLang(location.pathname), saved ?? lang)}${location.search}${location.hash}`;
    if (saved && saved !== lang && lang === "en") {
      navigate(target, { replace: true });
      return;
    }
    // First visit: offer the browser's language instead of switching, so
    // nobody is moved away from the page they asked for. Not while
    // prerendering (a headless browser), or every snapshot would carry it
    const fromBrowser = browserLang();
    if (!saved && fromBrowser && fromBrowser !== lang && !navigator.webdriver) setSuggest(fromBrowser);
    // Only on the first page of the visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (choice: Lang) => {
    saveLang(choice);
    setSuggest(null);
    if (choice !== lang) navigate(`${localizedPath(stripLang(location.pathname), choice)}${location.search}${location.hash}`);
  };

  return (
    <LangProvider value={lang}>
      <Outlet />
      {suggest && (
        <div
          lang={suggest}
          role="region"
          aria-label={LANG_NAMES[suggest]}
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-background p-3 text-sm shadow-lg"
        >
          <span className="flex-1">{SUGGESTION[suggest].text}</span>
          <button type="button" onClick={() => choose(suggest)} className="font-medium text-primary underline-offset-4 hover:underline">
            {SUGGESTION[suggest].switchTo}
          </button>
          <button type="button" onClick={() => choose(lang)} aria-label={SUGGESTION[suggest].dismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </LangProvider>
  );
}
