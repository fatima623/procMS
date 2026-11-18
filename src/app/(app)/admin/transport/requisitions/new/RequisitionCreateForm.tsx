'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RequisitionCreateForm() {
  const router = useRouter();
  const [purpose, setPurpose] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [requiredFrom, setRequiredFrom] = useState('');
  const [requiredTo, setRequiredTo] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!purpose.trim() || !fromLocation.trim() || !toLocation.trim() || !requiredFrom || !requiredTo) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/transport/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: purpose.trim(),
          fromLocation: fromLocation.trim(),
          toLocation: toLocation.trim(),
          requiredFrom,
          requiredTo,
          passengerCount,
          remarks: remarks.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to submit requisition.');

      router.push('/admin/transport/requisitions');
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
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Official Purpose *</label>
        <textarea
          className="input"
          rows={2}
          placeholder="e.g. Official visit to Naval Dockyard for inspection"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>From Location *</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. NHQ Islamabad"
            value={fromLocation}
            onChange={(e) => setFromLocation(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>To Location *</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Rawalpindi Station"
            value={toLocation}
            onChange={(e) => setToLocation(e.target.value)}
            required
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Required From *</label>
          <input
            type="datetime-local"
            className="input"
            value={requiredFrom}
            onChange={(e) => setRequiredFrom(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Required To *</label>
          <input
            type="datetime-local"
            className="input"
            value={requiredTo}
            onChange={(e) => setRequiredTo(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Passengers *</label>
          <input
            type="number"
            min={1}
            max={50}
            className="input"
            value={passengerCount}
            onChange={(e) => setPassengerCount(parseInt(e.target.value, 10))}
            required
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Remarks</label>
        <input
          type="text"
          className="input"
          placeholder="Special requirements (luggage, AC, etc.)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Vehicle Requisition'}
        </button>
      </div>
    </form>
  );
}
