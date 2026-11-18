import { requireSessionCtx } from '@/interfaces/ui/auth';
import { employeeService } from '@/infrastructure/hr/EmployeeService';
import { AttendanceBulkForm } from './AttendanceBulkForm';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';

export const metadata = { title: 'Attendance • HR' };
export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  await requireSessionCtx();

  const employees = await employeeService.list({ isActive: true });
  const sections = Array.from(new Set(employees.map((e) => e.section))).sort();

  const today = new Date();
  const recentAttendance = await employeeService.listAttendance(today);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>HR Attendance & Leave</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Bulk marking for daily attendance, casual/earned/medical leaves, and absence (ProcMS manual pp. 204–216).
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <AttendanceBulkForm
          employees={employees.map((e) => ({
            id: e.id,
            personnelNumber: e.personnelNumber,
            rank: e.rank,
            designation: e.designation,
            section: e.section,
          }))}
          sections={sections}
        />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Today's Recorded Leaves & Absences</h3>
        {recentAttendance.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            No absences or leaves recorded for today.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Personnel #</th>
                <th>Employee</th>
                <th>Section</th>
                <th>Status / Leave Kind</th>
                <th>Date</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {recentAttendance.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.employee.personnelNumber}</td>
                  <td>
                    <div className="font-semibold">{a.employee.rank}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{a.employee.designation}</div>
                  </td>
                  <td>{a.employee.section}</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        background: a.kind === 'ABSENT' ? 'var(--danger-bg)' : 'var(--warn-bg)',
                        color: a.kind === 'ABSENT' ? 'var(--danger)' : 'var(--warn)',
                      }}
                    >
                      {a.kind}
                    </span>
                  </td>
                  <td><DateLabel iso={a.fromDate} /></td>
                  <td>{a.remarks ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
