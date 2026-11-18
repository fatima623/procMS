'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TelephoneBillCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billMonth, setBillMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/admin/telephone-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          billMonth,
          billAmountMinor: amount,
          currency: 'PKR',
          dueDate,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        alert(j.error?.message || 'Failed to create bill.');
      } else {
        router.push('/admin/telephone-bills');
        router.refresh();
      }
    } catch {
      alert('Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Phone / Line Number</label>
        <input
          type="text"
          className="input"
          required
          placeholder="e.g. 051-9000000"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Bill Month (YYYY-MM)</label>
        <input
          type="month"
          className="input"
          required
          value={billMonth}
          onChange={(e) => setBillMonth(e.target.value)}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
          Bill Amount (PKR minor — paisa)
        </label>
        <input
          type="number"
          className="input"
          required
          min={0}
          placeholder="e.g. 1250000 = PKR 12,500.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Due Date</label>
        <input
          type="date"
          className="input"
          required
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Bill'}
        </button>
      </div>
    </form>
  );
}
