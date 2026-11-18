'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryLedgerKind } from '@prisma/client';

export function LedgerEntryForm({
  demands,
}: {
  demands: { id: string; demandNumber: string }[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<InventoryLedgerKind>(InventoryLedgerKind.ISSUANCE);
  const [sourceType, setSourceType] = useState<'demand' | 'manual'>('demand');
  const [sourceDemandId, setSourceDemandId] = useState(demands[0]?.id ?? '');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [uom, setUom] = useState('NOS');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!itemName.trim() || !quantity.trim() || !uom.trim()) {
      setError('Please provide item name, quantity, and UOM.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/stores/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          itemName: itemName.trim(),
          quantity: quantity.trim(),
          uom: uom.trim(),
          sourceDemandId: sourceType === 'demand' && sourceDemandId ? sourceDemandId : undefined,
          remarks: remarks.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save ledger entry.');

      router.push('/stores/ledger');
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

      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Entry Kind *</label>
        <div className="row" style={{ gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="kind"
              value={InventoryLedgerKind.ISSUANCE}
              checked={kind === InventoryLedgerKind.ISSUANCE}
              onChange={() => setKind(InventoryLedgerKind.ISSUANCE)}
            />
            Issuance (Stock Out)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="kind"
              value={InventoryLedgerKind.RECEIVING}
              checked={kind === InventoryLedgerKind.RECEIVING}
              onChange={() => setKind(InventoryLedgerKind.RECEIVING)}
            />
            Receiving (Stock In)
          </label>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Source *</label>
        <div className="row" style={{ gap: 16, marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="sourceType"
              value="demand"
              checked={sourceType === 'demand'}
              onChange={() => setSourceType('demand')}
            />
            Against Internal Demand
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="sourceType"
              value="manual"
              checked={sourceType === 'manual'}
              onChange={() => setSourceType('manual')}
            />
            Manual / Tender Receiving
          </label>
        </div>

        {sourceType === 'demand' && (
          <select
            className="input"
            value={sourceDemandId}
            onChange={(e) => setSourceDemandId(e.target.value)}
          >
            {demands.map((d) => (
              <option key={d.id} value={d.id}>
                {d.demandNumber}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Item Name *</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. A4 Paper Rim"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Quantity *</label>
          <input
            type="text"
            className="input"
            placeholder="Qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>UOM *</label>
          <input
            type="text"
            className="input"
            placeholder="NOS"
            value={uom}
            onChange={(e) => setUom(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Remarks</label>
        <textarea
          className="input"
          rows={3}
          placeholder="Optional notes, condition, batch number, etc."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Ledger Entry'}
        </button>
      </div>
    </form>
  );
}
