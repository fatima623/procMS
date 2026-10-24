import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard, type Accent } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'Admin • Procurement' };
export const dynamic = 'force-dynamic';

const I = {
  users:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3 3-5 7-5s7 2 7 5"/><path d="M17 11a3 3 0 100-6"/><path d="M22 20c0-2.5-2-4-5-4.5"/></svg>,
  grid:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  firm:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21V12h6v9"/></svg>,
  trophy:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4h8v6a4 4 0 11-8 0z"/><path d="M4 6h4M16 6h4M8 20h8M10 16v4M14 16v4"/></svg>,
  calendar:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>,
  tag:     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7" cy="7" r="1.5"/></svg>,
  wallet:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
  flame:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 20a6 6 0 0012 0c0-4-3-5-3-8 0-3-2-5-4-6 1 3-1 5-3 7-2 2-2 5 0 7-2 0-2-2-2-4"/></svg>,
  gauge:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 10-15.5 6"/><path d="M12 12l5-3"/></svg>,
  balance: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6l-4 7h8zM16 6l4 7h-8zM12 3v18M8 21h8"/></svg>,
  globe:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/></svg>,
  upload:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0-12l-4 4m4-4l4 4"/><path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4"/></svg>,
  mail:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>,
  log:     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>,
};

export default async function AdminLandingPage() {
  await requireRoles([Role.ADMIN]);

  const [users, sections, firms, fiscalYears, budgetHeads, allocations, auditCount] = await Promise.all([
    prisma.user.count(),
    prisma.section.count(),
    prisma.firm.count(),
    prisma.fiscalYear.count(),
    prisma.budgetHead.count(),
    prisma.budgetAllocation.count(),
    prisma.auditLog.count(),
  ]);

  const tiles: { href: string; label: string; count: number; desc: string; accent: Accent; icon: React.ReactNode }[] = [
    { href: '/admin/users',               accent: 'indigo',  icon: I.users,    label: 'Users',               count: users,       desc: 'Accounts, roles, section memberships' },
    { href: '/admin/sections',            accent: 'sky',     icon: I.grid,     label: 'Sections',            count: sections,    desc: 'Organisational units + hierarchy' },
    { href: '/admin/firms',               accent: 'emerald', icon: I.firm,     label: 'Firms',               count: firms,       desc: 'Vendor registry + blacklist' },
    { href: '/admin/firms/scorecard',     accent: 'amber',   icon: I.trophy,   label: 'Firm scorecard',      count: firms,       desc: 'Vendor funnel: invites → PRs won · win rate · query turnaround' },
    { href: '/admin/fiscal-years',        accent: 'violet',  icon: I.calendar, label: 'Fiscal years',        count: fiscalYears, desc: 'Active year marker, start/end dates' },
    { href: '/admin/budget-heads',        accent: 'teal',    icon: I.tag,      label: 'Budget heads',        count: budgetHeads, desc: 'Budget line codes referenced by indents' },
    { href: '/admin/budget-allocations',  accent: 'pink',    icon: I.wallet,   label: 'Budget allocations',  count: allocations, desc: 'Allocated amounts per year/head/section' },
    { href: '/admin/burndown',            accent: 'coral',   icon: I.flame,    label: 'Burn-down',           count: allocations, desc: 'Allocation vs committed vs awarded + EOY projection' },
    { href: '/admin/turnaround',          accent: 'indigo',  icon: I.gauge,    label: 'Turnaround',          count: 0,           desc: 'How fast firms answer queries, indenters resolve observations' },
    { href: '/admin/firms/compare',       accent: 'sky',     icon: I.balance,  label: 'Firm comparison',     count: firms,       desc: 'Side-by-side funnel comparison across 2–4 firms' },
    { href: '/admin/firms/geography',     accent: 'teal',    icon: I.globe,    label: 'Firm geography',      count: firms,       desc: 'Vendor concentration by country and city' },
    { href: '/admin/import',              accent: 'emerald', icon: I.upload,   label: 'Bulk import',         count: 0,           desc: 'CSV-based seeding for firms and users' },
    { href: '/admin/digest-recipients',   accent: 'violet',  icon: I.mail,     label: 'Digest recipients',   count: 0,           desc: 'Extra addresses on the weekly executive digest' },
    { href: '/admin/audit',               accent: 'amber',   icon: I.log,      label: 'Audit log',           count: auditCount,  desc: 'Immutable record of every state change' },
  ];

  return (
    <>
      <h1>Administration</h1>
      <p className="muted">Manage identity, organisation and reference data. Everything here is restricted to <code>ADMIN</code>.</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 20 }}>
        {tiles.map((t) => (
          <KpiCard key={t.href} accent={t.accent} icon={t.icon} label={t.label} value={t.count} sub={t.desc} href={t.href} />
        ))}
      </section>
    </>
  );
}
