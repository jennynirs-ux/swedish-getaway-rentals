import { useState, useRef, useEffect } from 'react';
import { useLocale, SUPPORTED_LOCALES } from '@/i18n/useLocale';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = () => {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LOCALES.find((l) => l.code === locale);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{current?.nativeName}</span>
        <span className="sm:hidden">{current?.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg py-1 z-50 min-w-[160px]">
          {SUPPORTED_LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted transition-colors ${
                locale === l.code ? 'bg-muted font-medium' : ''
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.nativeName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
