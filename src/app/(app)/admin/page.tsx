import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';

export const metadata = { title: 'Admin • Procurement' };
export const dynamic = 'force-dynamic';

export default async function AdminLandingPage() {
  await requireRoles([Role.ADMIN]);

  const [users, sections, firms, fiscalYears, budgetHeads, allocations] = await Promise.all([
    prisma.user.count(),
    prisma.section.count(),
    prisma.firm.count(),
    prisma.fiscalYear.count(),
    prisma.budgetHead.count(),
    prisma.budgetAllocation.count(),
  ]);

  const auditCount = await prisma.auditLog.count();
  const tiles = [
    { href: '/admin/users',               label: 'Users',               count: users,       desc: 'Accounts, roles, section memberships' },
    { href: '/admin/sections',            label: 'Sections',            count: sections,    desc: 'Organisational units + hierarchy' },
    { href: '/admin/firms',               label: 'Firms',               count: firms,       desc: 'Vendor registry + blacklist' },
    { href: '/admin/firms/scorecard',     label: 'Firm scorecard',      count: firms,       desc: 'Vendor funnel: invites → PRs won · win rate · query turnaround' },
    { href: '/admin/fiscal-years',        label: 'Fiscal years',        count: fiscalYears, desc: 'Active year marker, start/end dates' },
    { href: '/admin/budget-heads',        label: 'Budget heads',        count: budgetHeads, desc: 'Budget line codes referenced by indents' },
    { href: '/admin/budget-allocations',  label: 'Budget allocations',  count: allocations, desc: 'Allocated amounts per year/head/section' },
    { href: '/admin/burndown',            label: 'Burn-down',           count: allocations, desc: 'Allocation vs committed vs awarded + EOY projection' },
    { href: '/admin/turnaround',          label: 'Turnaround',          count: 0,           desc: 'How fast firms answer queries, indenters resolve observations' },
    { href: '/admin/firms/compare',       label: 'Firm comparison',     count: firms,       desc: 'Side-by-side funnel comparison across 2–4 firms' },
    { href: '/admin/firms/geography',     label: 'Firm geography',      count: firms,       desc: 'Vendor concentration by country and city' },
    { href: '/admin/import',              label: 'Bulk import',         count: 0,           desc: 'CSV-based seeding for firms and users' },
    { href: '/admin/digest-recipients',   label: 'Digest recipients',   count: 0,           desc: 'Extra addresses on the weekly executive digest' },
    { href: '/admin/audit',               label: 'Audit log',           count: auditCount,  desc: 'Immutable record of every state change' },
  ];

  return (
    <>
      <h1>Administration</h1>
      <p className="muted">Manage identity, organisation and reference data. Everything here is restricted to <code>ADMIN</code>.</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 20 }}>
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="dim" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              {t.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{t.count}</div>
            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{t.desc}</div>
          </Link>
        ))}
      </section>
    </>
  );
}
