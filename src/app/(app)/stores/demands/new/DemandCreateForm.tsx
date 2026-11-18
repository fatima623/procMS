'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SectionOption {
  id: string;
  code: string;
  name: string;
}

interface ItemRow {
  itemName: string;
  quantity: string;
  uom: string;
  remarks: string;
}

export function DemandCreateForm({ sections }: { sections: SectionOption[] }) {
  const router = useRouter();
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { itemName: '', quantity: '1', uom: 'NOS', remarks: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItemRow = () => {
    setItems([...items, { itemName: '', quantity: '1', uom: 'NOS', remarks: '' }]);
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

    if (!sectionId) {
      setError('Please select a section.');
      return;
    }

    const invalidItem = items.find((i) => !i.itemName.trim() || !i.quantity.trim() || !i.uom.trim());
    if (invalidItem) {
      setError('Each item must have a name, quantity, and unit of measurement (UOM).');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/stores/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raisedForSectionId: sectionId,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            itemName: i.itemName.trim(),
            quantity: i.quantity.trim(),
            uom: i.uom.trim(),
            remarks: i.remarks.trim() || undefined,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to create internal demand.');
      }

      router.push(`/stores/demands/${json.data.id}`);
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
        <label htmlFor="sectionId" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
          Target Section *
        </label>
        <select
          id="sectionId"
          className="input"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          required
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="notes" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
          Notes / Justification
        </label>
        <textarea
          id="notes"
          className="input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes or description regarding this requisition..."
        />
      </div>

      <div>
        <div className="row" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Demanded Items</h3>
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
              style={{ padding: 12, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 8, alignItems: 'center' }}
            >
              <div>
                <label style={{ fontSize: 11, display: 'block', color: 'var(--text-dim)' }}>Item Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. A4 Paper Rim"
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
                  placeholder="NOS / KG"
                  value={item.uom}
                  onChange={(e) => updateItem(idx, 'uom', e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, display: 'block', color: 'var(--text-dim)' }}>Remarks</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Optional remarks"
                  value={item.remarks}
                  onChange={(e) => updateItem(idx, 'remarks', e.target.value)}
                />
              </div>
              <div style={{ paddingTop: 14 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => removeItemRow(idx)}
                  disabled={items.length <= 1}
                  style={{ color: 'var(--danger)', padding: '6px 10px' }}
                  title="Remove row"
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
          {submitting ? 'Submitting...' : 'Submit Demand'}
        </button>
      </div>
    </form>
  );
}
