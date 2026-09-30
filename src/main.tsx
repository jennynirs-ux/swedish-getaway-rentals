import "@fontsource-variable/inter";
import "@fontsource-variable/playfair-display";
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'leaflet/dist/leaflet.css'

// Each deploy replaces all built files, so a tab opened before it asks for
// code that no longer exists; and just after a deploy, before every Cloudflare
// server has the new files, a code file can come back as the HTML page. The
// browser then caches that HTML for the file (assets are cached for a year).
// Re-fetch the failed files past the cache, then reload (at most once a minute).
window.addEventListener("vite:preloadError", async (event) => {
  try {
    const key = "reloaded-for-new-version";
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Storage blocked: reload anyway
  }
  event.preventDefault();
  // The named file, plus every built file this page loaded: the bad one may be
  // a file that the failing one imports
  const message = String((event as Event & { payload?: unknown }).payload ?? "");
  const named = message.match(/(?:https?:\/\/[^\s'"]+)?\/assets\/[^\s'"]+\.(?:js|css)/g) ?? [];
  const loaded = performance.getEntriesByType("resource").map((e) => e.name).filter((url) => url.includes("/assets/"));
  await Promise.all([...new Set([...named, ...loaded])].map((url) => fetch(url, { cache: "reload" }).catch(() => undefined)));
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
