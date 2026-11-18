import Link from 'next/link';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { employeeService } from '@/infrastructure/hr/EmployeeService';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';

export const metadata = { title: 'Employees • HR' };
export const dynamic = 'force-dynamic';

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; active?: string }>;
}) {
  await requireSessionCtx();
  const sp = await searchParams;
  const isActive = sp.active === 'false' ? false : true;
  const employees = await employeeService.list({
    section: sp.section,
    isActive,
  });

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Employees</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            HR personnel register — service records, leaves, house hiring, disciplinary actions.
          </p>
        </div>
        <div className="grow" />
        <Link className="btn btn-primary" href="/hr/employees/new">
          + Add Employee
        </Link>
      </div>

      {employees.length === 0 ? (
        <Empty>No employees found.</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Rank / Designation</th>
              <th>Section</th>
              <th>Joining</th>
              <th>Contact</th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td className="mono">{e.personnelNumber}</td>
                <td>
                  <div className="font-semibold">{e.rank}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{e.designation}</div>
                </td>
                <td>{e.section}</td>
                <td><DateLabel iso={e.dateOfJoining} /></td>
                <td>{e.contact ?? <span className="muted">—</span>}</td>
                <td>
                  {e.isActive ? (
                    <span style={{ color: 'var(--ok)', fontSize: 13 }}>Active</span>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontSize: 13 }}>Inactive</span>
                  )}
                </td>
                <td className="right">
                  <Link
                    href={`/hr/employees/${e.id}`}
                    className="btn"
                    style={{ fontSize: 12, padding: '3px 8px' }}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
