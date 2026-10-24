'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface MultiSelectOption {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
}

/**
 * Chip-based multi-select dropdown. Selected items appear as removable chips
 * above the search input; the dropdown lists the remaining options, filtered
 * by the search text. Keyboard-accessible: arrow-up/down to navigate, Enter
 * to toggle, Backspace with an empty input removes the last chip.
 */
export function MultiSelect(props: {
  readonly options: readonly MultiSelectOption[];
  readonly selected: readonly string[];
  readonly onChange: (values: string[]) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly maxVisibleOptions?: number;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedSet = useMemo(() => new Set(props.selected), [props.selected]);
  const selectedOptions = useMemo(
    () => props.options.filter((o) => selectedSet.has(o.value)),
    [props.options, selectedSet],
  );
  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return props.options
      .filter((o) => !selectedSet.has(o.value))
      .filter((o) => !q || o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q))
      .slice(0, props.maxVisibleOptions ?? 50);
  }, [props.options, props.maxVisibleOptions, selectedSet, query]);

  useEffect(() => {
    if (highlight >= available.length) setHighlight(0);
  }, [available.length, highlight]);

  // Click-outside closes the dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function toggle(value: string) {
    if (selectedSet.has(value)) {
      props.onChange(props.selected.filter((v) => v !== value));
    } else {
      props.onChange([...props.selected, value]);
    }
    setQuery('');
    inputRef.current?.focus();
  }

  function remove(value: string) {
    props.onChange(props.selected.filter((v) => v !== value));
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && query === '' && props.selected.length > 0) {
      e.preventDefault();
      remove(props.selected[props.selected.length - 1]!);
      return;
    }
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); return; }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(available.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = available[highlight];
      if (opt) toggle(opt.value);
    } else if (e.key === 'Escape') { setOpen(false); }
  }

  return (
    <div
      ref={containerRef}
      className="input"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: 6,
        minHeight: 38,
        position: 'relative',
        cursor: props.disabled ? 'not-allowed' : 'text',
        opacity: props.disabled ? 0.6 : 1,
      }}
      onClick={() => { if (!props.disabled) { setOpen(true); inputRef.current?.focus(); } }}
    >
      {selectedOptions.map((o) => (
        <span
          key={o.value}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--accent-weak)',
            color: 'var(--accent-hover)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {o.label}
          {!props.disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(o.value); }}
              aria-label={`Remove ${o.label}`}
              style={{
                background: 'transparent', border: 'none', color: 'inherit',
                cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        disabled={props.disabled}
        placeholder={selectedOptions.length === 0 ? (props.placeholder ?? 'Select…') : ''}
        style={{
          flex: 1, minWidth: 100, border: 'none', outline: 'none',
          background: 'transparent', color: 'var(--text)', font: 'inherit', padding: '2px 4px',
        }}
      />
      {open && !props.disabled && available.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 260,
            overflowY: 'auto',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow)',
            zIndex: 50,
            padding: 4,
            listStyle: 'none',
          }}
        >
          {available.map((o, idx) => (
            <li
              key={o.value}
              role="option"
              aria-selected={idx === highlight}
              onMouseDown={(e) => { e.preventDefault(); toggle(o.value); }}
              onMouseEnter={() => setHighlight(idx)}
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
                background: idx === highlight ? 'var(--bg-hover)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{o.label}</span>
              {o.hint && <span className="muted" style={{ fontSize: 12 }}>{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
      {open && !props.disabled && available.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            padding: '8px 10px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow)',
            zIndex: 50,
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          No more options{query ? ` matching "${query}"` : ''}.
        </div>
      )}
    </div>
  );
}
