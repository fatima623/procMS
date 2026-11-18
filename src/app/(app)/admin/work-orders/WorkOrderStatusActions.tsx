'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkOrderStatus } from '@prisma/client';

export function WorkOrderStatusActions({
  workOrderId,
  status,
  assignedTo,
}: {
  workOrderId: string;
  status: WorkOrderStatus;
  assignedTo?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<WorkOrderStatus>(WorkOrderStatus.IN_PROGRESS);
  const [assignee, setAssignee] = useState(assignedTo ?? '');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const openAction = (st: WorkOrderStatus) => {
    setTargetStatus(st);
    setModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          assignedTo: assignee.trim() || undefined,
          costMinor: cost ? cost : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error?.message || 'Failed to update work order.');
      } else {
        setModalOpen(false);
        router.refresh();
      }
    } catch {
      alert('Action failed.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return <span className="muted" style={{ fontSize: 12 }}>Locked</span>;
  }

  return (
    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
      {status === 'OPEN' && (
        <button
          type="button"
          className="btn"
          style={{ fontSize: 12, padding: '3px 8px' }}
          onClick={() => openAction(WorkOrderStatus.IN_PROGRESS)}
          disabled={loading}
        >
          Assign / Start
        </button>
      )}

      {status === 'IN_PROGRESS' && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: 12, padding: '3px 8px' }}
          onClick={() => openAction(WorkOrderStatus.COMPLETED)}
          disabled={loading}
        >
          Complete
        </button>
      )}

      <button
        type="button"
        className="btn"
        style={{ fontSize: 12, padding: '3px 8px', color: 'var(--danger)' }}
        onClick={() => openAction(WorkOrderStatus.CANCELLED)}
        disabled={loading}
      >
        Cancel
      </button>

      {modalOpen && (
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
          <div className="card" style={{ width: 420, padding: 20, background: 'var(--bg)', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 14px 0' }}>Update Work Order → {targetStatus}</h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Assignee / Contractor</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. MES Electrician / M/S Tech Services"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                />
              </div>

              {targetStatus === 'COMPLETED' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Actual Cost Minor (PKR)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 500000 (PKR 50.00)"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Work Notes / Report</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Progress or completion remarks"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
