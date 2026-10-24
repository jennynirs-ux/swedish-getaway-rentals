import type { Locale } from "date-fns";
import { de, enGB, sv } from "date-fns/locale";
import { type Lang, useLang } from "./index";

/** date-fns (and the Calendar, react-day-picker) in each language */
export const DATE_FNS_LOCALES: Record<Lang, Locale> = { en: enGB, sv, de };

export const useDateFnsLocale = (): Locale => DATE_FNS_LOCALES[useLang()];
