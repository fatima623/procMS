'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LeaveKind } from '@prisma/client';

interface EmployeeItem {
  id: string;
  personnelNumber: string;
  rank: string;
  designation: string;
  section: string;
}

export function AttendanceBulkForm({
  employees,
  sections,
}: {
  employees: EmployeeItem[];
  sections: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [kind, setKind] = useState<LeaveKind>(LeaveKind.ABSENT);
  const [remarks, setRemarks] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const filteredEmployees = useMemo(() => {
    if (!selectedSection) return employees;
    return employees.filter((e) => e.section === selectedSection);
  }, [employees, selectedSection]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredEmployees.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert('Please select at least one employee.');
      return;
    }

    try {
      setLoading(true);
      setMsg(null);
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          employeeIds: selectedIds,
          kind,
          remarks: remarks.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const j = await res.json();
        setMsg({ ok: false, text: j.error?.message || 'Failed to record attendance.' });
      } else {
        const j = await res.json();
        setMsg({ ok: true, text: `Successfully marked ${j.data?.count ?? selectedIds.length} employee(s) as ${kind}.` });
        setSelectedIds([]);
        setRemarks('');
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: 'Network or server error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      {msg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            marginBottom: 16,
            background: msg.ok ? 'var(--ok-bg)' : 'var(--danger-bg)',
            color: msg.ok ? 'var(--ok)' : 'var(--danger)',
            fontSize: 14,
          }}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Date</label>
            <input
              type="date"
              className="input"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Filter by Section</label>
            <select
              className="input"
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedIds([]);
              }}
            >
              <option value="">All Sections ({employees.length})</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s} ({employees.filter((e) => e.section === s).length})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Status / Leave Kind</label>
            <select
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value as LeaveKind)}
            >
              <option value={LeaveKind.ABSENT}>Absent</option>
              <option value={LeaveKind.CASUAL}>Casual Leave</option>
              <option value={LeaveKind.EARNED}>Earned Leave</option>
              <option value={LeaveKind.MEDICAL}>Medical Leave</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Remarks (Optional)</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Approved causal leave / Uninformed absence"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Select Employees ({selectedIds.length} of {filteredEmployees.length} selected)
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn"
                style={{ fontSize: 12, padding: '2px 8px' }}
                onClick={() => toggleAll(true)}
              >
                Select All
              </button>
              <button
                type="button"
                className="btn"
                style={{ fontSize: 12, padding: '2px 8px' }}
                onClick={() => toggleAll(false)}
              >
                Deselect All
              </button>
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No active employees found for this section.</p>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Personnel #</th>
                    <th>Rank</th>
                    <th>Designation</th>
                    <th>Section</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((e) => {
                    const isChecked = selectedIds.includes(e.id);
                    return (
                      <tr
                        key={e.id}
                        style={{ cursor: 'pointer', background: isChecked ? 'var(--highlight-bg)' : undefined }}
                        onClick={() => toggleOne(e.id)}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOne(e.id)}
                            onClick={(ev) => ev.stopPropagation()}
                          />
                        </td>
                        <td className="mono font-semibold">{e.personnelNumber}</td>
                        <td>{e.rank}</td>
                        <td>{e.designation}</td>
                        <td>{e.section}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || selectedIds.length === 0}
          >
            {loading ? 'Saving...' : `Mark Attendance (${selectedIds.length})`}
          </button>
        </div>
      </form>
    </div>
  );
}
