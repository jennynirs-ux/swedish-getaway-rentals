import { useLocation, useNavigate } from "react-router-dom";
import { Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isLocalizedPath, LANGS, LANG_NAMES, localizedPath, saveLang, stripLang, useLangOrNull } from "@/i18n";

const LABEL = { en: "Language", sv: "Språk", de: "Sprache" } as const;

/** The language menu in the navigation: the same page in another language. Only on the guest site */
const LanguageMenu = ({ className, onChosen }: { className?: string; onChosen?: () => void }) => {
  const lang = useLangOrNull();
  const location = useLocation();
  const navigate = useNavigate();
  if (!lang || !isLocalizedPath(location.pathname)) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={className} aria-label={LABEL[lang]} title={LABEL[lang]}>
        <Globe className="h-5 w-5" />
        <span className="text-sm font-medium uppercase">{lang}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((choice) => (
          <DropdownMenuItem
            key={choice}
            lang={choice}
            aria-current={choice === lang ? "true" : undefined}
            className={choice === lang ? "font-semibold" : undefined}
            onSelect={() => {
              saveLang(choice);
              onChosen?.();
              if (choice !== lang) {
                navigate(`${localizedPath(stripLang(location.pathname), choice)}${location.search}${location.hash}`);
              }
            }}
          >
            {LANG_NAMES[choice]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageMenu;
