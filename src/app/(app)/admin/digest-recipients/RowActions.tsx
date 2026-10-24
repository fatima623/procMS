'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Row-level actions on the digest-recipients list. Separate client file so
 * the parent page can stay a server component.
 */
export function ClientToggleButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/digest-recipients/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) router.refresh();
    } finally { setBusy(false); }
  }
  return (
    <button type="button" className="btn" onClick={toggle} disabled={busy}>
      {isActive ? 'Pause' : 'Resume'}
    </button>
  );
}

export function DeleteRecipient({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!confirm(`Remove ${email} from the digest list?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/digest-recipients/${id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } finally { setBusy(false); }
  }
  return <button type="button" className="btn btn-danger" onClick={run} disabled={busy}>Remove</button>;
}
