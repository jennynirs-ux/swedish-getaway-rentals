import { forwardRef, useCallback } from "react";
import {
  Link as RouterLink,
  Navigate as RouterNavigate,
  useLocation,
  useNavigate as useRouterNavigate,
  type LinkProps,
  type NavigateFunction,
  type NavigateOptions,
  type NavigateProps,
  type To,
} from "react-router-dom";
import { type Lang, localizedPath, stripLang, useLang } from "./index";

// react-router's Link, Navigate and useNavigate, but a path such as "/cabins"
// stays in the page's language ("/sv/cabins" on a Swedish page). Guest pages
// and the components they share import these instead of react-router-dom's.

const localizeTo = (to: To, lang: Lang): To =>
  typeof to === "string" ? localizedPath(to, lang) : to.pathname ? { ...to, pathname: localizedPath(to.pathname, lang) } : to;

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(({ to, ...props }, ref) => {
  const lang = useLang();
  return <RouterLink ref={ref} to={localizeTo(to, lang)} {...props} />;
});
Link.displayName = "Link";

export const Navigate = ({ to, ...props }: NavigateProps) => <RouterNavigate to={localizeTo(to, useLang())} {...props} />;

export function useNavigate(): NavigateFunction {
  const navigate = useRouterNavigate();
  const lang = useLang();
  return useCallback(
    (to: To | number, options?: NavigateOptions) =>
      typeof to === "number" ? navigate(to) : navigate(localizeTo(to, lang), options),
    [navigate, lang],
  ) as NavigateFunction;
}

/** The current path without its language prefix: "/sv/cabins" → "/cabins" */
export function useBasePath(): string {
  return stripLang(useLocation().pathname);
}

export { useLocation, useParams, useSearchParams } from "react-router-dom";
