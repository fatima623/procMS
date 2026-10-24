/**
 * Runs synchronously BEFORE React mounts to prevent a flash of the wrong
 * theme on first paint. Serialised to a string and injected into <head> via
 * a <script dangerouslySetInnerHTML>.
 *
 * Priority:
 *   1. `localStorage.theme`  — explicit user choice wins
 *   2. OS `prefers-color-scheme` — honour the system preference
 *   3. Time of day — light between 06:00 and 18:00 local, dark otherwise
 */
export const THEME_BOOT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
      return;
    }
    var osLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    if (osLight) { document.documentElement.setAttribute('data-theme', 'light'); return; }
    var osDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (osDark) return; // leave default dark
    var hour = new Date().getHours();
    if (hour >= 6 && hour < 18) document.documentElement.setAttribute('data-theme', 'light');
  } catch (e) { /* localStorage blocked — stay on default dark */ }
})();
`.trim();
