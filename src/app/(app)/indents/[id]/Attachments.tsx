'use client';
import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

interface AttachmentRow {
  readonly id: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: string;
  readonly uploadedAt: string;
  readonly uploadedByName: string | null;
}

function formatSize(bytes: string | number | bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function Attachments({
  indentId,
  attachments,
}: {
  readonly indentId: string;
  readonly attachments: readonly AttachmentRow[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.set('subject', 'INDENT');
      form.set('subjectId', indentId);
      form.set('file', file);
      const res = await fetch('/api/attachments', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {err && <div className="err">{err}</div>}
      {attachments.length === 0 ? (
        <div className="muted" style={{ fontSize: 13, padding: '6px 0' }}>No attachments yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {attachments.map((a) => (
            <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <a href={`/api/attachments/${a.id}/download`} className="mono">{a.originalName}</a>
              </span>
              <span className="muted mono" style={{ fontSize: 12 }}>{formatSize(a.sizeBytes)}</span>
              <span className="muted" style={{ fontSize: 12 }}>{a.uploadedByName ?? '—'}</span>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 10 }}>
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={onPick} />
        <button
          type="button"
          className="btn"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {busy ? 'Uploading…' : '+ Upload file'}
        </button>
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          Max 25 MB per file. Scripts (.exe, .bat, .sh …) rejected.
        </div>
      </div>
    </>
  );
}
