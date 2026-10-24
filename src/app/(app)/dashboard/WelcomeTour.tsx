'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * First-time guided tour. Highlights a sequence of elements on the current
 * page by looking them up via `data-tour-id`, draws a labelled card next to
 * each one, remembers "dismissed" in localStorage.
 *
 * This is intentionally generic — pass the step list in from any page.
 */
export interface TourStep {
  readonly tourId: string;
  readonly title: string;
  readonly body: string;
}

export function WelcomeTour({ tourKey, steps }: { tourKey: string; steps: readonly TourStep[] }) {
  const storageKey = `tour.dismissed.${tourKey}`;
  const [visible, setVisible] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Show once per user, per tour.
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== '1') setVisible(true);
    } catch { /* ignore */ }
  }, [storageKey]);

  // Measure the current target.
  useEffect(() => {
    if (!visible) return;
    const step = steps[i];
    if (!step) return;
    const el = document.querySelector(`[data-tour-id="${step.tourId}"]`);
    if (!el) { setRect(null); return; }
    const measure = () => {
      const r = (el as HTMLElement).getBoundingClientRect();
      setRect({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height });
    };
    measure();
    (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 400); // after scroll animation
    return () => { window.removeEventListener('resize', measure); clearTimeout(t); };
  }, [visible, i, steps]);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
  }
  function next() {
    if (i >= steps.length - 1) dismiss();
    else setI((n) => n + 1);
  }
  function prev() { setI((n) => Math.max(0, n - 1)); }

  if (!visible || steps.length === 0) return null;
  const step = steps[i]!;

  // Position the card below the target, falling back to the top-right.
  const cardStyle: React.CSSProperties = rect
    ? {
        position: 'absolute',
        top: rect.top + rect.height + 12,
        left: Math.max(16, Math.min(rect.left, document.documentElement.clientWidth - 360 - 16)),
        width: 360,
      }
    : { position: 'fixed', top: 80, right: 16, width: 360 };

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'rgba(0,0,0,0.35)', zIndex: 60,
        }}
      />
      {rect && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: rect.top - 6, left: rect.left - 6,
            width: rect.width + 12, height: rect.height + 12,
            borderRadius: 10,
            boxShadow: '0 0 0 3px var(--accent), 0 0 0 9999px rgba(0,0,0,0.0)',
            background: 'transparent',
            zIndex: 61, pointerEvents: 'none',
          }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog" aria-labelledby="tour-title"
        className="card"
        style={{ ...cardStyle, zIndex: 62, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
      >
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <span className="dim" style={{ fontSize: 11 }}>Tour · {i + 1} / {steps.length}</span>
          <div className="grow" />
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={dismiss}>Skip ×</button>
        </div>
        <h3 id="tour-title" style={{ margin: 0 }}>{step.title}</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{step.body}</p>
        <div className="row row-end" style={{ gap: 6, marginTop: 10 }}>
          {i > 0 && <button className="btn" onClick={prev}>← Back</button>}
          <button className="btn btn-primary" onClick={next}>
            {i === steps.length - 1 ? 'Got it' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  );
}
