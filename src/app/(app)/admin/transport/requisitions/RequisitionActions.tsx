'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VehicleRequisitionStatus } from '@prisma/client';

export function RequisitionActions({
  requisitionId,
  status,
}: {
  requisitionId: string;
  status: VehicleRequisitionStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [assignedVehicle, setAssignedVehicle] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleDecide = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`/api/transport/requisitions/${requisitionId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          assignedVehicleRef: decision === 'APPROVE' ? assignedVehicle : undefined,
          remarks: remarks.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error?.message || 'Failed to decide requisition.');
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

  const handleComplete = async () => {
    if (!confirm('Mark this vehicle requisition as completed?')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/transport/requisitions/${requisitionId}/complete`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error?.message || 'Failed to mark completed.');
      } else {
        router.refresh();
      }
    } catch {
      alert('Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
      {status === 'PENDING' && (
        <button
          type="button"
          className="btn"
          style={{ fontSize: 12, padding: '3px 8px' }}
          onClick={() => setModalOpen(true)}
          disabled={loading}
        >
          Decide
        </button>
      )}

      {status === 'APPROVED' && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: 12, padding: '3px 8px' }}
          onClick={handleComplete}
          disabled={loading}
        >
          Complete
        </button>
      )}

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
          <div className="card" style={{ width: 400, padding: 20, background: 'var(--bg)', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 14px 0' }}>Decide Requisition</h3>
            <form onSubmit={handleDecide} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="row" style={{ gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="APPROVE"
                    checked={decision === 'APPROVE'}
                    onChange={() => setDecision('APPROVE')}
                  />
                  Approve
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="REJECT"
                    checked={decision === 'REJECT'}
                    onChange={() => setDecision('REJECT')}
                  />
                  Reject
                </label>
              </div>

              {decision === 'APPROVE' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Assigned Vehicle Ref</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. PN-HIACE-104"
                    value={assignedVehicle}
                    onChange={(e) => setAssignedVehicle(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Remarks</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Optional decision remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
