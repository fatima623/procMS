import type { ReactNode } from 'react';
import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx, currentImpersonation } from '@/interfaces/ui/auth';
import { SignOutButton } from './SignOutButton';
import { ThemeToggle } from '@/interfaces/ui/components/ThemeToggle';
import { MobileNav } from './MobileNav';
import { NotificationBell } from './NotificationBell';
import { ImpersonationBanner } from './ImpersonationBanner';

interface NavItem { href: string; label: string; show: (roles: readonly Role[], firmId?: string) => boolean; }

const NAV: NavItem[] = [
  { href: '/dashboard',       label: 'Dashboard',   show: () => true },
  { href: '/search',          label: 'Search',      show: (r) => !r.includes(Role.FIRM_REP) || r.includes(Role.ADMIN) },
  { href: '/indents',         label: 'Indents',     show: (r) => !r.includes(Role.FIRM_REP) || r.includes(Role.ADMIN) },
  { href: '/approvals',       label: 'My approvals',show: (r) => [Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP, Role.SUPTD, Role.CPO, Role.ADMIN].some((x) => r.includes(x)) },
  { href: '/tsrs',            label: 'TSR queue',   show: (r) => r.includes(Role.INSPECTORATE) || r.includes(Role.ADMIN) },
  { href: '/firm/invites',    label: 'IT invites',  show: (r, f) => !!f || r.includes(Role.ADMIN) },
  { href: '/firm/queries',    label: 'Queries',     show: (r, f) => !!f || r.includes(Role.ADMIN) },
  { href: '/firm/prs',        label: 'Purchase requisitions', show: (r, f) => !!f || r.includes(Role.ADMIN) },
  { href: '/settings/security', label: 'Security',  show: () => true },
  { href: '/docs',            label: 'API docs',    show: (r) => r.includes(Role.ADMIN) },
  { href: '/admin',           label: 'Admin',       show: (r) => r.includes(Role.ADMIN) },
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
          <Link
            href={n.href}
            style={{
              display: 'block',
              padding: '8px 12px',
              color: 'var(--text)',
              borderRadius: 6,
              textDecoration: 'none',
            }}
          >
            {n.label}
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
