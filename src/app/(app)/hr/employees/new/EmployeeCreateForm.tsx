'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function EmployeeCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    personnelNumber: '',
    rank: '',
    designation: '',
    section: '',
    dateOfJoining: '',
    dateOfBirth: '',
    bloodGroup: '',
    contact: '',
    maritalStatus: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: Record<string, unknown> = {
        personnelNumber: form.personnelNumber.trim(),
        rank:            form.rank.trim(),
        designation:     form.designation.trim(),
        section:         form.section.trim(),
        dateOfJoining:   form.dateOfJoining,
        dateOfBirth:     form.dateOfBirth,
      };
      if (form.bloodGroup.trim())    payload.bloodGroup   = form.bloodGroup.trim();
      if (form.contact.trim())       payload.contact      = form.contact.trim();
      if (form.maritalStatus.trim()) payload.maritalStatus = form.maritalStatus.trim();

      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json();
        alert(j.error?.message || 'Failed to create employee.');
      } else {
        const { data } = await res.json() as { data: { id: string } };
        router.push(`/hr/employees/${data.id}`);
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
      style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {([
        ['personnelNumber', 'Personnel Number', 'text', true],
        ['rank',            'Rank',             'text', true],
        ['designation',     'Designation',      'text', true],
        ['section',         'Section / Unit',   'text', true],
        ['dateOfJoining',   'Date of Joining',  'date', true],
        ['dateOfBirth',     'Date of Birth',    'date', true],
        ['bloodGroup',      'Blood Group',      'text', false],
        ['contact',         'Contact No.',      'text', false],
      ] as [keyof typeof form, string, string, boolean][]).map(([key, label, type, required]) => (
        <div key={key}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
            {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
          </label>
          <input
            type={type}
            className="input"
            required={required}
            value={form[key]}
            onChange={set(key)}
          />
        </div>
      ))}

      <div>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Marital Status</label>
        <select className="input" value={form.maritalStatus} onChange={set('maritalStatus')}>
          <option value="">— Select —</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
        </select>
      </div>

      <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Create Employee'}
        </button>
      </div>
    </form>
  );
}
