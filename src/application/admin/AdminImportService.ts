import { Role, SectionKind } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import { parseCsv } from '@/infrastructure/common/csv';
import type { AuthContext } from '../ports/AuthContext';
import { ForbiddenError } from '@/domain/errors/DomainError';

void SectionKind; // for future section-import extension

export interface ImportResult {
  readonly total: number;
  readonly created: number;
  readonly updated: number;
  readonly errors: readonly { readonly line: number; readonly reason: string; readonly row: Record<string, string> }[];
}

const ALL_ROLES = new Set<Role>(Object.values(Role));

export class AdminImportService {
  private requireAdmin(ctx: AuthContext): void {
    if (!ctx.roles.includes(Role.ADMIN)) throw new ForbiddenError('Admin role required');
  }

  // ---------------------------------------------------------------------------
  // Firms
  //
  // CSV columns (headers, case-sensitive):
  //   code, name, ntn, address, city, country, email, phone
  // Only `code` + `name` are required; the rest are optional.
  // ---------------------------------------------------------------------------
  public async importFirms(ctx: AuthContext, csv: string): Promise<ImportResult> {
    this.requireAdmin(ctx);
    const parsed = parseCsv(csv);
    const required = ['code', 'name'];
    for (const r of required) {
      if (!parsed.headers.includes(r)) {
        return { total: 0, created: 0, updated: 0, errors: [{ line: 0, reason: `Missing required column: ${r}`, row: {} }] };
      }
    }

    type ImpError = ImportResult['errors'][number];
    let created = 0;
    let updated = 0;
    const errors: ImpError[] = [];

    for (let idx = 0; idx < parsed.rows.length; idx++) {
      const row = parsed.rows[idx]!;
      const line = idx + 2;      // +1 for 0-based, +1 for header
      try {
        if (!row.code) throw new Error('`code` is empty');
        if (!row.name) throw new Error('`name` is empty');
        const existing = await prisma.firm.findUnique({ where: { code: row.code } });
        const data = {
          code: row.code,
          name: row.name,
          ntn: row.ntn || null,
          address: row.address || null,
          city: row.city || null,
          country: row.country || null,
          email: row.email || null,
          phone: row.phone || null,
          isActive: true,
          isBlacklisted: false,
        };
        if (existing) {
          await prisma.firm.update({ where: { id: existing.id }, data });
          updated += 1;
        } else {
          await prisma.firm.create({ data: { id: ulid(), ...data } });
          created += 1;
        }
      } catch (err) {
        errors.push({ line, reason: err instanceof Error ? err.message : String(err), row });
      }
    }

    await this.audit(ctx, 'admin.import.firms', { total: parsed.rows.length, created, updated, errorCount: errors.length });
    return { total: parsed.rows.length, created, updated, errors };
  }

  // ---------------------------------------------------------------------------
  // Users
  //
  // CSV columns:
  //   email, displayName, password, rank, roles, sectionCodes, firmCode
  // - `password` is required for new users; left blank for updates keeps the
  //   existing password.
  // - `roles` is pipe-separated: "ADMIN|AD|DD".
  // - `sectionCodes` is pipe-separated: "ADP-1|DP-OFFICE".
  // - `firmCode` is required when `roles` includes FIRM_REP.
  // ---------------------------------------------------------------------------
  public async importUsers(ctx: AuthContext, csv: string): Promise<ImportResult> {
    this.requireAdmin(ctx);
    const parsed = parseCsv(csv);
    const required = ['email', 'displayName'];
    for (const r of required) {
      if (!parsed.headers.includes(r)) {
        return { total: 0, created: 0, updated: 0, errors: [{ line: 0, reason: `Missing required column: ${r}`, row: {} }] };
      }
    }

    type ImpError = ImportResult['errors'][number];
    let created = 0;
    let updated = 0;
    const errors: ImpError[] = [];

    for (let idx = 0; idx < parsed.rows.length; idx++) {
      const row = parsed.rows[idx]!;
      const line = idx + 2;
      try {
        if (!row.email) throw new Error('`email` is empty');
        if (!row.displayName) throw new Error('`displayName` is empty');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) throw new Error(`Invalid email: ${row.email}`);

        const roles = (row.roles ?? '').split('|').map((s) => s.trim()).filter(Boolean) as Role[];
        for (const r of roles) if (!ALL_ROLES.has(r)) throw new Error(`Unknown role: ${r}`);
        if (roles.length === 0) throw new Error('At least one role is required');

        const sectionCodes = (row.sectionCodes ?? '').split('|').map((s) => s.trim()).filter(Boolean);
        const sections = sectionCodes.length > 0
          ? await prisma.section.findMany({ where: { code: { in: sectionCodes } }, select: { id: true, code: true } })
          : [];
        const missingSection = sectionCodes.find((c) => !sections.some((s) => s.code === c));
        if (missingSection) throw new Error(`Unknown section code: ${missingSection}`);

        let firmId: string | null = null;
        if (row.firmCode) {
          const firm = await prisma.firm.findUnique({ where: { code: row.firmCode }, select: { id: true } });
          if (!firm) throw new Error(`Unknown firm code: ${row.firmCode}`);
          firmId = firm.id;
        }
        if (roles.includes(Role.FIRM_REP) && !firmId) throw new Error('FIRM_REP users must have firmCode');
        if (!roles.includes(Role.FIRM_REP) && firmId) throw new Error('firmCode only valid for FIRM_REP users');

        const existing = await prisma.user.findUnique({ where: { email: row.email.toLowerCase() } });
        if (existing) {
          const data: Record<string, unknown> = {
            displayName: row.displayName,
            rank: row.rank || null,
            firmId,
          };
          if (row.password) data.passwordHash = await bcrypt.hash(row.password, 12);
          await prisma.$transaction([
            prisma.user.update({ where: { id: existing.id }, data: data as Parameters<typeof prisma.user.update>[0]['data'] }),
            prisma.userRole.deleteMany({ where: { userId: existing.id } }),
            prisma.userRole.createMany({ data: [...new Set(roles)].map((role) => ({ userId: existing.id, role })) }),
            prisma.sectionMember.deleteMany({ where: { userId: existing.id } }),
            prisma.sectionMember.createMany({ data: sections.map((s) => ({ userId: existing.id, sectionId: s.id })) }),
          ]);
          updated += 1;
        } else {
          if (!row.password) throw new Error('`password` is required for new users');
          if (row.password.length < 10) throw new Error('password must be at least 10 characters');
          const passwordHash = await bcrypt.hash(row.password, 12);
          await prisma.user.create({
            data: {
              id: ulid(),
              email: row.email.toLowerCase(),
              displayName: row.displayName,
              rank: row.rank || null,
              passwordHash,
              firmId,
              roles: { create: [...new Set(roles)].map((role) => ({ role })) },
              memberships: { create: sections.map((s) => ({ sectionId: s.id })) },
            },
          });
          created += 1;
        }
      } catch (err) {
        errors.push({ line, reason: err instanceof Error ? err.message : String(err), row });
      }
    }

    await this.audit(ctx, 'admin.import.users', { total: parsed.rows.length, created, updated, errorCount: errors.length });
    return { total: parsed.rows.length, created, updated, errors };
  }

  private async audit(ctx: AuthContext, action: string, metadata: Record<string, unknown>): Promise<void> {
    await prisma.auditLog.create({
      data: {
        id: ulid(), actorUserId: ctx.userId,
        action, subjectType: 'IMPORT', subjectId: ulid(),
        metadata: metadata as never,
      },
    });
  }
}
