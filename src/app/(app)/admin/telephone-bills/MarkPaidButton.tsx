'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Bill {
  id: string;
  phoneNumber: string;
  billMonth: string;
  billAmountMinor: bigint;
  currency: string;
  dueDate: Date;
  paidOn: Date | null;
}

export function MarkPaidButton({ bill }: { bill: Bill }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [paidOn, setPaidOn] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  if (bill.paidOn) {
    return (
      <span style={{ fontSize: 12, color: 'var(--ok)' }}>
        Paid {new Date(bill.paidOn).toLocaleDateString()}
      </span>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/telephone-bills/${bill.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidOn }),
      });
      if (!res.ok) {
        const j = await res.json();
        alert(j.error?.message || 'Failed to mark paid.');
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      alert('Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        style={{ fontSize: 12, padding: '3px 8px' }}
        onClick={() => setOpen(true)}
      >
        Mark Paid
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div className="card" style={{ width: 360, padding: 20, background: 'var(--bg)' }}>
            <h3 style={{ margin: '0 0 14px 0' }}>Mark Bill as Paid</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Payment Date</label>
                <input
                  type="date"
                  className="input"
                  required
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                />
              </div>
              <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
