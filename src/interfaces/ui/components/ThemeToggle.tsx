'use client';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/**
 * Light/dark theme toggle. Reads/writes `localStorage.theme` and toggles the
 * `data-theme` attribute on <html>. Pairs with THEME_BOOT_SCRIPT, which sets
 * the initial attribute before React hydrates to prevent a FOUC.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme | null) ?? 'dark';
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
  }

  // Hidden until mounted to avoid showing the wrong icon briefly.
  if (!mounted) return <button className="btn btn-ghost" aria-label="Theme" style={{ width: 38 }}>·</button>;

  return (
    <button
      className="btn btn-ghost"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      style={{ padding: '6px 10px' }}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
