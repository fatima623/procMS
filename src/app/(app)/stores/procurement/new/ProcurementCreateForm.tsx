'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ItemRow {
  itemName: string;
  quantity: string;
  uom: string;
}

export function ProcurementCreateForm() {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { itemName: '', quantity: '1', uom: 'NOS' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItemRow = () => {
    setItems([...items, { itemName: '', quantity: '1', uom: 'NOS' }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const invalid = items.find((i) => !i.itemName.trim() || !i.quantity.trim() || !i.uom.trim());
    if (invalid) {
      setError('Please provide item name, quantity, and UOM for all rows.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/stores/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            itemName: i.itemName.trim(),
            quantity: i.quantity.trim(),
            uom: i.uom.trim(),
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create internal procurement.');

      router.push(`/stores/procurement/${json.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {error && <div className="err">{error}</div>}

      <div>
        <label htmlFor="notes" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
          Procurement Description / Justification
        </label>
        <textarea
          id="notes"
          className="input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Purpose of this internal small procurement..."
        />
      </div>

      <div>
        <div className="row" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Items Required</h3>
          <div className="grow" />
          <button type="button" className="btn" onClick={addItemRow} style={{ fontSize: 13 }}>
            + Add item row
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              className="card"
              style={{ padding: 12, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}
            >
              <div>
                <label style={{ fontSize: 11, display: 'block', color: 'var(--text-dim)' }}>Item Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Printer Cartridge HP 85A"
                  value={item.itemName}
                  onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, display: 'block', color: 'var(--text-dim)' }}>Quantity *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, display: 'block', color: 'var(--text-dim)' }}>UOM *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="NOS"
                  value={item.uom}
                  onChange={(e) => updateItem(idx, 'uom', e.target.value)}
                  required
                />
              </div>
              <div style={{ paddingTop: 14 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => removeItemRow(idx)}
                  disabled={items.length <= 1}
                  style={{ color: 'var(--danger)', padding: '6px 10px' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Internal Procurement'}
        </button>
      </div>
    </form>
  );
}
