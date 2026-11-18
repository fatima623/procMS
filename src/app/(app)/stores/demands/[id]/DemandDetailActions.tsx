'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InternalDemandStatus } from '@prisma/client';

export function DemandDetailActions({
  demandId,
  status,
}: {
  demandId: string;
  status: InternalDemandStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [uom, setUom] = useState('NOS');
  const [remarks, setRemarks] = useState('');

  const handleAction = async (endpoint: 'issue' | 'close') => {
    if (!confirm(`Are you sure you want to ${endpoint} this demand?`)) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stores/demands/${demandId}/${endpoint}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || `Failed to ${endpoint} demand.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stores/demands/${demandId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: itemName.trim(),
          quantity: quantity.trim(),
          uom: uom.trim(),
          remarks: remarks.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to add item.');
      setShowAddModal(false);
      setItemName('');
      setQuantity('1');
      setUom('NOS');
      setRemarks('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="row" style={{ gap: 10 }}>
        {status !== 'CLOSED' && (
          <button
            type="button"
            className="btn"
            onClick={() => setShowAddModal(true)}
            disabled={loading}
          >
            + Add item
          </button>
        )}

        {status === 'OPEN' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleAction('issue')}
            disabled={loading}
          >
            Mark as Issued
          </button>
        )}

        {status !== 'CLOSED' && (
          <button
            type="button"
            className="btn"
            onClick={() => handleAction('close')}
            disabled={loading}
            style={{ color: 'var(--danger)' }}
          >
            Close Demand
          </button>
        )}
      </div>

      {showAddModal && (
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
          <div className="card" style={{ width: 440, padding: 24, background: 'var(--bg)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Add Item to Demand</h3>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Item Name *</label>
                <input
                  type="text"
                  className="input"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Quantity *</label>
                  <input
                    type="text"
                    className="input"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>UOM *</label>
                  <input
                    type="text"
                    className="input"
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Remarks</label>
                <input
                  type="text"
                  className="input"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
              <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowAddModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeleteDemandItemButton({
  demandId,
  itemId,
  disabled,
}: {
  demandId: string;
  itemId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Remove this item from the demand?')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/stores/demands/${demandId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error?.message || 'Failed to remove item.');
      } else {
        router.refresh();
      }
    } catch {
      alert('Failed to remove item.');
    } finally {
      setLoading(false);
    }
  };

  if (disabled) return null;

  return (
    <button
      type="button"
      className="btn"
      onClick={handleDelete}
      disabled={loading}
      style={{ color: 'var(--danger)', padding: '2px 8px', fontSize: 12 }}
      title="Delete item"
    >
      ✕
    </button>
  );
}
