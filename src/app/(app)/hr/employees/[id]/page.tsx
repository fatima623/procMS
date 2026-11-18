import { notFound } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { employeeService } from '@/infrastructure/hr/EmployeeService';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { Empty } from '@/interfaces/ui/components/Empty';

export const dynamic = 'force-dynamic';

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSessionCtx();
  const { id } = await params;

  let employee;
  try {
    employee = await employeeService.get(id);
  } catch {
    notFound();
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>{employee.rank} — {employee.designation}</h1>
          <p className="muted mono" style={{ margin: '4px 0 0 0' }}>
            #{employee.personnelNumber} · {employee.section}
          </p>
        </div>
        <div className="grow" />
        <span
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 13,
            background: employee.isActive ? 'var(--ok-bg)' : 'var(--danger-bg)',
            color: employee.isActive ? 'var(--ok)' : 'var(--danger)',
          }}
        >
          {employee.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Basic Info */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Basic Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
          <div><span className="muted">Date of Joining:</span> <DateLabel iso={employee.dateOfJoining} /></div>
          <div><span className="muted">Date of Birth:</span> <DateLabel iso={employee.dateOfBirth} /></div>
          <div><span className="muted">Blood Group:</span> {employee.bloodGroup ?? '—'}</div>
          <div><span className="muted">Contact:</span> {employee.contact ?? '—'}</div>
          <div><span className="muted">Marital Status:</span> {employee.maritalStatus ?? '—'}</div>
        </div>
      </div>

      {/* Service Records */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Service Records</h3>
        {employee.serviceRecords.length === 0 ? (
          <Empty>No service records.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Section</th>
                <th>From</th>
                <th>To</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {employee.serviceRecords.map((r) => (
                <tr key={r.id}>
                  <td>{r.section}</td>
                  <td><DateLabel iso={r.postingFrom} /></td>
                  <td>{r.postingTo ? <DateLabel iso={r.postingTo} /> : <span className="muted">Present</span>}</td>
                  <td>{r.remarks ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Leave Records */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Leave Records</h3>
        {employee.leaves.length === 0 ? (
          <Empty>No leave records.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>From</th>
                <th>To</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {employee.leaves.map((l) => (
                <tr key={l.id}>
                  <td>{l.kind}</td>
                  <td><DateLabel iso={l.fromDate} /></td>
                  <td><DateLabel iso={l.toDate} /></td>
                  <td>{l.remarks ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* House Hiring */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>House Hiring</h3>
        {employee.houseHirings.length === 0 ? (
          <Empty>No house hiring records.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Landlord</th>
                <th>Monthly Rent</th>
                <th>From</th>
                <th>To</th>
              </tr>
            </thead>
            <tbody>
              {employee.houseHirings.map((h) => (
                <tr key={h.id}>
                  <td>{h.address}</td>
                  <td>{h.landlord}</td>
                  <td className="mono">
                    <MoneyLabel amountMinor={h.monthlyRentMinor} currency={h.currency} />
                  </td>
                  <td><DateLabel iso={h.hireStart} /></td>
                  <td>{h.hireEnd ? <DateLabel iso={h.hireEnd} /> : <span className="muted">Present</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Disciplinary */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Disciplinary Actions</h3>
        {employee.disciplinaryActions.length === 0 ? (
          <Empty>No disciplinary actions.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Issued On</th>
                <th>Authority</th>
                <th>Decision</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {employee.disciplinaryActions.map((d) => (
                <tr key={d.id}>
                  <td>{d.kind}</td>
                  <td><DateLabel iso={d.issuedOn} /></td>
                  <td>{d.authority}</td>
                  <td>{d.decision}</td>
                  <td>{d.remarks ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
