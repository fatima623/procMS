import Link from 'next/link';
import { requireRoles } from '@/interfaces/ui/auth';
import { REGISTRY_ROLES } from '@/infrastructure/registry/RegistryService';
import { listOutwardOptions, listPostalStamps } from '@/interfaces/ui/views/RegistryViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';
import { StampForm } from './StampForm';

export const metadata = { title: 'Postal stamp register • Procurement' };
export const dynamic = 'force-dynamic';

export default async function PostalStampsPage() {
  await requireRoles(REGISTRY_ROLES);
  const [{ rows, grandTotal }, outwardOptions] = await Promise.all([listPostalStamps(), listOutwardOptions()]);
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Postal stamp register</h1>
        <div className="grow" />
        <Link className="btn" href="/registry/correspondence">← Mail inward / outward</Link>
      </div>
      <p className="muted">Stamps affixed to outgoing physical mail (DAK). Link an entry to an outward letter where possible.</p>

      <section className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Add entry</h2>
        <StampForm outwardOptions={outwardOptions} />
      </section>

      {rows.length === 0 ? (
        <Empty>No postal stamps recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Used on</th>
                <th>Letter</th>
                <th>Denomination (PKR)</th>
                <th>Qty</th>
                <th>Total (PKR)</th>
                <th>Entered by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><DateLabel iso={s.usedOn} /></td>
                  <td className="mono">
                    {s.correspondenceId ? <Link href={`/registry/correspondence/${s.correspondenceId}`}>{s.controlNumber}</Link> : <span className="muted">—</span>}
                  </td>
                  <td className="mono">{s.denomination}</td>
                  <td className="mono">{s.quantity}</td>
                  <td className="mono">{s.total}</td>
                  <td>{s.enteredByName ?? '—'}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="right"><strong>Grand total</strong></td>
                <td className="mono"><strong>{grandTotal}</strong></td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
