import "@fontsource-variable/inter";
import "@fontsource-variable/playfair-display";
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'leaflet/dist/leaflet.css'

// Each deploy replaces all built files, so a tab opened before it asks for
// code that no longer exists when it opens a page loaded on demand. Reload
// to get the new version instead of a blank page (at most once a minute).
window.addEventListener("vite:preloadError", (event) => {
  try {
    const key = "reloaded-for-new-version";
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Storage blocked: reload anyway
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
