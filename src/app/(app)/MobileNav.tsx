'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Mobile drawer wrapper. On wide viewports the children render in place as
 * the always-visible sidebar; on narrow viewports they slide in from the
 * left behind a burger button in the header.
 */
export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll while drawer is open on mobile.
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost mobile-only"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        style={{ padding: '6px 10px' }}
      >
        {open ? '✕' : '☰'}
      </button>
      {open && <div className="mobile-only drawer-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <nav className={`app-sidebar${open ? ' is-open' : ''}`}>
        {children}
      </nav>
    </>
  );
}
