import type { ReactNode } from 'react';
import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx, currentImpersonation } from '@/interfaces/ui/auth';
import { SignOutButton } from './SignOutButton';
import { ThemeToggle } from '@/interfaces/ui/components/ThemeToggle';
import { MobileNav } from './MobileNav';
import { NotificationBell } from './NotificationBell';
import { ImpersonationBanner } from './ImpersonationBanner';

interface NavItem { href: string; label: string; icon: ReactNode; show: (roles: readonly Role[], firmId?: string) => boolean; }

/* Tiny inline-SVG icon set shared by the sidebar — matches the dashboard's I.* set. */
const NAV_ICON = {
  dashboard: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  search:    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>,
  stack:     <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  check:     <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  wrench:    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 7a4 4 0 11-5 5l-6 6 2 2 6-6a4 4 0 015-5l-2 2 1 1 1-1 1 1-1 1 1 1 1-1z"/></svg>,
  mail:      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>,
  chat:      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  doc:       <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>,
  shield:    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  book:      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4z"/><path d="M4 4v16"/></svg>,
  gear:      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1A1.7 1.7 0 0019.4 9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>,
};

const NAV: NavItem[] = [
  { href: '/dashboard',         label: 'Dashboard',             icon: NAV_ICON.dashboard, show: () => true },
  { href: '/search',            label: 'Search',                icon: NAV_ICON.search,    show: (r) => !r.includes(Role.FIRM_REP) || r.includes(Role.ADMIN) },
  { href: '/indents',           label: 'Indents',               icon: NAV_ICON.stack,     show: (r) => !r.includes(Role.FIRM_REP) || r.includes(Role.ADMIN) },
  { href: '/approvals',         label: 'My approvals',          icon: NAV_ICON.check,     show: (r) => [Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP, Role.SUPTD, Role.CPO, Role.ADMIN].some((x) => r.includes(x)) },
  { href: '/tsrs',              label: 'TSR queue',             icon: NAV_ICON.wrench,    show: (r) => r.includes(Role.INSPECTORATE) || r.includes(Role.ADMIN) },
  { href: '/firm/invites',      label: 'IT invites',            icon: NAV_ICON.mail,      show: (r, f) => !!f || r.includes(Role.ADMIN) },
  { href: '/firm/queries',      label: 'Queries',               icon: NAV_ICON.chat,      show: (r, f) => !!f || r.includes(Role.ADMIN) },
  { href: '/firm/prs',          label: 'Purchase requisitions', icon: NAV_ICON.doc,       show: (r, f) => !!f || r.includes(Role.ADMIN) },
  { href: '/settings/security', label: 'Security',              icon: NAV_ICON.shield,    show: () => true },
  { href: '/docs',              label: 'API docs',              icon: NAV_ICON.book,      show: (r) => r.includes(Role.ADMIN) },
  { href: '/admin',             label: 'Admin',                 icon: NAV_ICON.gear,      show: (r) => r.includes(Role.ADMIN) },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireSessionCtx();
  const impersonation = await currentImpersonation();
  const items = NAV.filter((n) => n.show(ctx.roles, ctx.firmId));
  const rolesLabel = ctx.roles.join(', ') || 'No roles';

  const navLinks = (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((n) => (
        <li key={n.href}>
          <Link href={n.href}>
            <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--text-dim)' }}>{n.icon}</span>
            <span>{n.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="app-shell">
      {impersonation && (
        <ImpersonationBanner
          adminEmail={impersonation.impersonatedByEmail}
          targetEmail={impersonation.targetEmail}
        />
      )}
      <header className="app-header">
        <MobileNav>{navLinks}</MobileNav>
        <Link href="/dashboard" style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none', marginLeft: 10 }}>
          🛳  Procurement
        </Link>
        <div style={{ flex: 1 }} />
        <div className="muted mono header-identity" style={{ marginRight: 16, fontSize: 12 }}>
          {ctx.userId.slice(-6)} • <span className="dim">{rolesLabel}</span>
        </div>
        <NotificationBell />
        <ThemeToggle />
        <SignOutButton />
      </header>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
