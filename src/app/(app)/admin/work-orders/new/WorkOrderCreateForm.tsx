'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkOrderKind } from '@prisma/client';

export function WorkOrderCreateForm() {
  const router = useRouter();
  const [kind, setKind] = useState<WorkOrderKind>(WorkOrderKind.MAINTENANCE);
  const [subject, setSubject] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Please provide a subject for the work order.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          subject: subject.trim(),
          assignedTo: assignedTo.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create work order.');

      router.push('/admin/work-orders');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="err">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Work Kind *</label>
          <select
            className="input"
            value={kind}
            onChange={(e) => setKind(e.target.value as WorkOrderKind)}
          >
            {Object.values(WorkOrderKind).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Assignee / Department</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Electrical Section / M/S Al-Madina Tech"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Subject / Work Description *</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. Repair of Central Air Conditioning Unit Block-B"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Notes &amp; Scope of Work</label>
        <textarea
          className="input"
          rows={3}
          placeholder="Detailed fault description, parts needed, location..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Work Order'}
        </button>
      </div>
    </form>
  );
}
