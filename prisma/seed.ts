/**
 * Development seed — populates every stage of the DP(Navy) workflow so
 * dashboards, lists and action panels have real data to show.
 *
 * Idempotent: re-running wipes & rebuilds the workflow fixtures (indents,
 * approval chains, IT/TSR/CST/PR etc) but leaves users / sections / firms /
 * reference data upserted in place.
 *
 * All passwords are "Pr0cur3-DEV!" — DEV ONLY.
 */
import {
  PrismaClient,
  Role,
  SectionKind,
  IndentStatus,
  IndentType,
  IndentPriority,
  ApprovalSubject,
  ApprovalChainStatus,
  ApprovalStepStatus,
  ITStatus,
  OfferStatus,
  TSRStatus,
  TSRVerdict,
  CSTStatus,
  PRStatus,
  Prisma,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ulid } from 'ulid';

const prisma = new PrismaClient();
const PASSWORD = 'Pr0cur3-DEV!';

type SectionCache = Record<string, { id: string }>;
type UserCache = Record<string, { id: string; email: string }>;
type FirmCache = Record<string, { id: string; code: string }>;

// =============================================================================
// Reference-data upserts
// =============================================================================

async function upsertFiscalYear(label: string, starts: string, ends: string, active: boolean) {
  return prisma.fiscalYear.upsert({
    where: { label },
    update: { startsOn: new Date(starts), endsOn: new Date(ends), isActive: active },
    create: { id: ulid(), label, startsOn: new Date(starts), endsOn: new Date(ends), isActive: active },
  });
}

async function upsertBudgetHead(code: string, description: string) {
  return prisma.budgetHead.upsert({
    where: { code },
    update: { description, isActive: true },
    create: { id: ulid(), code, description, isActive: true },
  });
}

async function upsertSection(code: string, name: string, kind: SectionKind) {
  return prisma.section.upsert({
    where: { code },
    update: { name, kind, isActive: true },
    create: { id: ulid(), code, name, kind, isActive: true },
  });
}

async function upsertUser(email: string, displayName: string, roles: Role[], sectionCodes: string[], extras: { rank?: string; firmCode?: string } = {}): Promise<{ id: string; email: string }> {
  const sections = await prisma.section.findMany({ where: { code: { in: sectionCodes } }, select: { id: true } });
  const firm = extras.firmCode ? await prisma.firm.findUnique({ where: { code: extras.firmCode }, select: { id: true } }) : null;
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.userRole.deleteMany({ where: { userId: existing.id } });
    await prisma.sectionMember.deleteMany({ where: { userId: existing.id } });
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        displayName,
        rank: extras.rank ?? null,
        firmId: firm?.id ?? null,
        isActive: true,
        passwordHash,
        roles: { create: [...new Set(roles)].map((role) => ({ role })) },
        memberships: { create: sections.map((s) => ({ sectionId: s.id })) },
      },
    });
    return { id: existing.id, email: existing.email };
  }
  const u = await prisma.user.create({
    data: {
      id: ulid(),
      email,
      displayName,
      rank: extras.rank ?? null,
      firmId: firm?.id ?? null,
      passwordHash,
      roles: { create: [...new Set(roles)].map((role) => ({ role })) },
      memberships: { create: sections.map((s) => ({ sectionId: s.id })) },
    },
  });
  return { id: u.id, email: u.email };
}

async function upsertFirm(code: string, name: string, city: string, country: string, ntn?: string) {
  return prisma.firm.upsert({
    where: { code },
    update: { name, city, country, ntn: ntn ?? null, isActive: true, isBlacklisted: false },
    create: { id: ulid(), code, name, city, country, ntn: ntn ?? null },
  });
}

// =============================================================================
// Workflow helpers
// =============================================================================

/** Convert a decimal main-unit amount (e.g. "100.50") to minor units in 10^-4. */
function toMinorDecimal(amount: string): string {
  const [intPart, fracPartRaw = ''] = amount.split('.');
  const fracPart = (fracPartRaw + '0000').slice(0, 4);
  return `${intPart}.${fracPart}`;
}

interface IndentFixture {
  indentNumber: string;
  controlNumber?: string;
  subject: string;
  type?: IndentType;
  priority?: IndentPriority;
  indenterKey: string;              // userCache key
  sectionCode: string;              // owning section code
  assignedAdpCode?: string;         // assigned ADP code
  budgetHeadCode: string;
  status: IndentStatus;
  items: readonly { description: string; qty: number; uom: string; unitPrice: string; code?: string }[];
  submittedDaysAgo?: number;
  closedDaysAgo?: number;
}

interface IndentCtx {
  indent: { id: string; indentNumber: string; subject: string };
  itPerformaId?: string;
  cstId?: string;
}

async function createIndent(fx: IndentFixture, users: UserCache, sections: SectionCache, bhIdByCode: Record<string, string>, fyId: string): Promise<IndentCtx> {
  const now = new Date();
  const createdAt = new Date(now.getTime() - ((fx.submittedDaysAgo ?? 7) + 2) * 86_400_000);
  const submittedAt = fx.status === IndentStatus.DRAFT ? null : new Date(now.getTime() - (fx.submittedDaysAgo ?? 5) * 86_400_000);
  const closedAt = fx.closedDaysAgo ? new Date(now.getTime() - fx.closedDaysAgo * 86_400_000) : null;

  const indenter = users[fx.indenterKey];
  const section = sections[fx.sectionCode];
  const assignedAdp = fx.assignedAdpCode ? sections[fx.assignedAdpCode] : null;
  if (!indenter || !section) throw new Error(`Missing indenter(${fx.indenterKey}) or section(${fx.sectionCode})`);

  const indentId = ulid();
  const itemsTotalMinor = fx.items.reduce((acc, it) => {
    const scaledQty = BigInt(Math.round(it.qty * 10_000));
    const unitMinor = decimalToMinor(it.unitPrice);
    return acc + (unitMinor * scaledQty) / 10_000n;
  }, 0n);
  const totalDecimal = minorToDecimal(itemsTotalMinor);

  await prisma.indent.create({
    data: {
      id: indentId,
      indentNumber: fx.indentNumber,
      controlNumber: fx.controlNumber ?? null,
      subject: fx.subject,
      type: fx.type ?? IndentType.NORMAL,
      priority: fx.priority ?? IndentPriority.NORMAL,
      status: fx.status,
      estimatedValue: totalDecimal,
      currency: 'PKR',
      indenterId: indenter.id,
      sectionId: section.id,
      assignedAdpId: assignedAdp?.id ?? null,
      fiscalYearId: fyId,
      budgetHeadId: bhIdByCode[fx.budgetHeadCode]!,
      submittedAt,
      closedAt,
      createdAt,
      updatedAt: now,
      items: {
        create: fx.items.map((it, idx) => ({
          id: ulid(),
          lineNo: idx + 1,
          itemCode: it.code ?? null,
          description: it.description,
          quantity: toMinorDecimal(String(it.qty)),
          uom: it.uom,
          estimatedUnitPrice: minorToDecimal(decimalToMinor(it.unitPrice)),
          currency: 'PKR',
        })),
      },
    },
  });

  return { indent: { id: indentId, indentNumber: fx.indentNumber, subject: fx.subject } };
}

function decimalToMinor(decimal: string): bigint {
  const neg = decimal.startsWith('-');
  const body = neg ? decimal.slice(1) : decimal;
  const [intPart, fracPartRaw = ''] = body.split('.');
  const fracPart = (fracPartRaw + '0000').slice(0, 4);
  const m = BigInt(intPart ?? '0') * 10_000n + BigInt(fracPart || '0');
  return neg ? -m : m;
}
function minorToDecimal(minor: bigint): string {
  const sign = minor < 0n ? '-' : '';
  const abs = minor < 0n ? -minor : minor;
  const intPart = abs / 10_000n;
  const fracPart = (abs % 10_000n).toString().padStart(4, '0');
  return `${sign}${intPart}.${fracPart}`;
}

async function makeApprovalChain(
  subject: ApprovalSubject,
  subjectId: string,
  template: readonly Role[],
  decidedUpToIndex: number,            // -1 = none decided, 0 = first done, template.length-1 = all done
  finalChainStatus: ApprovalChainStatus,
  users: UserCache,
) {
  const chainId = ulid();
  const now = new Date();
  const createdAt = new Date(now.getTime() - 3 * 86_400_000);
  const chain = await prisma.approvalChain.create({
    data: {
      id: chainId,
      subject,
      subjectId,
      status: finalChainStatus,
      currentIndex: finalChainStatus === ApprovalChainStatus.PENDING
        ? Math.min(decidedUpToIndex + 1, template.length - 1)
        : template.length - 1,
      completedAt: finalChainStatus === ApprovalChainStatus.PENDING ? null : now,
      createdAt,
    },
  });
  const stepRows = template.map((role, idx) => {
    let status: ApprovalStepStatus = ApprovalStepStatus.PENDING;
    let decidedByUserId: string | null = null;
    let decidedAt: Date | null = null;
    let comments: string | null = null;
    if (idx <= decidedUpToIndex) {
      // decided step
      if (idx === decidedUpToIndex && finalChainStatus === ApprovalChainStatus.REJECTED) {
        status = ApprovalStepStatus.REJECTED;
        comments = 'Insufficient technical justification; needs rework.';
      } else {
        status = ApprovalStepStatus.APPROVED;
        comments = idx % 2 === 0 ? 'Approved.' : 'LGTM — forwarded.';
      }
      const actor = pickActorForRole(users, role);
      decidedByUserId = actor;
      decidedAt = new Date(createdAt.getTime() + (idx + 1) * 12 * 3600_000);
    }
    return { role, status, decidedByUserId, decidedAt, comments };
  });
  await prisma.approvalStep.createMany({
    data: stepRows.map((s, idx) => ({
      id: ulid(),
      chainId,
      stepIndex: idx,
      role: s.role,
      assignedUserId: null,
      status: s.status,
      decidedByUserId: s.decidedByUserId,
      decidedAt: s.decidedAt,
      comments: s.comments,
    })),
  });
  return chain;
}

function pickActorForRole(users: UserCache, role: Role): string {
  const map: Record<string, string | undefined> = {
    [Role.AD]: users.ad?.id,
    [Role.DD]: users.dd?.id,
    [Role.DP_N]: users.dpn?.id,
    [Role.DGDP]: users.dgdp?.id,
    [Role.SECY_DP]: users.secydp?.id,
    [Role.SUPTD]: users.suptd?.id,
    [Role.CPO]: users.cpo?.id,
  };
  return map[role] ?? users.admin!.id;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('[seed] start');

  // -------------------------------------------------------------------------
  // Wipe workflow fixtures (keep users/sections/firms/reference-data)
  // -------------------------------------------------------------------------
  console.log('[seed] clearing workflow fixtures…');
  await prisma.purchaseRequisition.deleteMany();
  await prisma.cSTLine.deleteMany();
  await prisma.cST.deleteMany();
  await prisma.commercialOffer.deleteMany();
  await prisma.tSRQuery.deleteMany();
  await prisma.tSREvaluation.deleteMany();
  await prisma.technicalScrutinyReport.deleteMany();
  await prisma.technicalOffer.deleteMany();
  await prisma.iTFirmInvite.deleteMany();
  await prisma.iTPerforma.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.approvalChain.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.indentStatusHistory.deleteMany();
  await prisma.indentItem.deleteMany();
  await prisma.indent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();

  // -------------------------------------------------------------------------
  // Reference data
  // -------------------------------------------------------------------------
  console.log('[seed] fiscal years + budget heads…');
  const fyPast  = await upsertFiscalYear('2024-25', '2024-07-01', '2025-06-30', false);
  const fyPrev  = await upsertFiscalYear('2025-26', '2025-07-01', '2026-06-30', false);
  const fyCurrent = await upsertFiscalYear('2026-27', '2026-07-01', '2027-06-30', true);
  const fyNext  = await upsertFiscalYear('2027-28', '2027-07-01', '2028-06-30', false);
  void fyPast; void fyPrev; void fyNext;

  const bhMap: Record<string, string> = {};
  for (const [code, desc] of [
    ['NAVY-CAP',    'Naval capital procurement'],
    ['NAVY-REV',    'Naval revenue procurement'],
    ['NAVY-OEM',    'OEM proprietary spares'],
    ['NAVY-ENG',    'Marine engineering spares'],
    ['NAVY-WPN',    'Weapons & munitions'],
    ['NAVY-COMMS',  'Communications & radar'],
    ['NAVY-HULL',   'Hull & structural'],
    ['NAVY-MED',    'Medical & dive support'],
    ['NAVY-CLOTH',  'Clothing & stores'],
    ['NAVY-TRAIN',  'Training equipment'],
  ] as const) {
    const bh = await upsertBudgetHead(code, desc);
    bhMap[code] = bh.id;
  }

  // -------------------------------------------------------------------------
  // Sections
  // -------------------------------------------------------------------------
  console.log('[seed] sections…');
  const sectionDefs = [
    ['CR',           'CR Section',                              SectionKind.CR],
    ['BUDGET',       'Budget Section',                          SectionKind.BUDGET],
    ['COORD',        'Coordination Section',                    SectionKind.COORD],
    ['ADP-1',        'Concerned ADP — Engineering',             SectionKind.ADP],
    ['ADP-2',        'Concerned ADP — Weapons',                 SectionKind.ADP],
    ['ADP-3',        'Concerned ADP — Communications',          SectionKind.ADP],
    ['SUPTD',        'Superintendent',                          SectionKind.SUPTD],
    ['DP-OFFICE',    'DP Office',                               SectionKind.DP_OFFICE],
    ['INSPECTORATE', 'Technical Inspectorate',                  SectionKind.INSPECTORATE],
    ['FLEET-HQ',     'Fleet Headquarters (Indenter)',           SectionKind.INDENTER],
    ['FLEET-KHI',    'Fleet Karachi (Indenter)',                SectionKind.INDENTER],
    ['FLEET-ORMARA', 'Fleet Ormara (Indenter)',                 SectionKind.INDENTER],
  ] as const;
  const secCache: SectionCache = {};
  for (const [code, name, kind] of sectionDefs) {
    const s = await upsertSection(code, name, kind);
    secCache[code] = { id: s.id };
  }

  // -------------------------------------------------------------------------
  // Firms (needed before firm-rep users)
  // -------------------------------------------------------------------------
  console.log('[seed] firms…');
  const firmDefs = [
    ['F-001', 'Marine Systems (Pvt) Ltd',       'Karachi',   'PK', '1234567-8'],
    ['F-002', 'Naval Spares International',     'Karachi',   'PK', '2345678-9'],
    ['F-003', 'Hamza Marine Engineering',       'Karachi',   'PK', '3456789-0'],
    ['F-004', 'Pakistan Ordnance Factories',    'Wah',       'PK', '4567890-1'],
    ['F-005', 'Al-Kazim Instruments',           'Lahore',    'PK', '5678901-2'],
    ['F-006', 'Techno Marine Services',         'Karachi',   'PK', '6789012-3'],
    ['F-007', 'Rolls-Royce Marine (agent)',     'Islamabad', 'PK', '7890123-4'],
    ['F-008', 'Thales Pakistan',                'Islamabad', 'PK', '8901234-5'],
    ['F-009', 'Harris Communications (agent)',  'Karachi',   'PK', '9012345-6'],
    ['F-010', 'Al-Noor Defence Supplies',       'Rawalpindi','PK', '0123456-7'],
  ] as const;
  const firmCache: FirmCache = {};
  for (const [code, name, city, country, ntn] of firmDefs) {
    const f = await upsertFirm(code, name, city, country, ntn);
    firmCache[code] = { id: f.id, code };
  }

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  console.log('[seed] users…');
  const usersCache: UserCache = {};
  usersCache.admin     = await upsertUser('admin@dp.navy',      'System Administrator', [Role.ADMIN], []);
  usersCache.admin2    = await upsertUser('admin2@dp.navy',     'Fatima Khan (Admin)',  [Role.ADMIN], []);

  usersCache.indenter  = await upsertUser('indenter@dp.navy',   'Lt Cdr A. Khan',       [Role.INDENTER], ['FLEET-HQ'],     { rank: 'Lt Cdr' });
  usersCache.indenter2 = await upsertUser('indenter2@dp.navy',  'Lt S. Ahmed',          [Role.INDENTER], ['FLEET-KHI'],    { rank: 'Lt' });
  usersCache.indenter3 = await upsertUser('indenter3@dp.navy',  'Cdr M. Riaz',          [Role.INDENTER], ['FLEET-ORMARA'], { rank: 'Cdr' });

  usersCache.cr        = await upsertUser('cr@dp.navy',         'CR Clerk',             [Role.CR_STAFF],        ['CR']);
  usersCache.budget    = await upsertUser('budget@dp.navy',     'Budget Officer',       [Role.BUDGET_STAFF],    ['BUDGET']);
  usersCache.coord     = await upsertUser('coord@dp.navy',      'COORD Officer',        [Role.COORD_STAFF],     ['COORD']);
  usersCache.adp1      = await upsertUser('adp1@dp.navy',       'ADP-1 Head',           [Role.ADP_STAFF],       ['ADP-1']);
  usersCache.adp2      = await upsertUser('adp2@dp.navy',       'ADP-2 Head',           [Role.ADP_STAFF],       ['ADP-2']);
  usersCache.adp3      = await upsertUser('adp3@dp.navy',       'ADP-3 Head',           [Role.ADP_STAFF],       ['ADP-3']);
  usersCache.suptd     = await upsertUser('suptd@dp.navy',      'Superintendent',       [Role.SUPTD],           ['SUPTD'],       { rank: 'Capt' });

  usersCache.ad        = await upsertUser('ad@dp.navy',         'AD — DP Office',       [Role.AD],              ['DP-OFFICE'],   { rank: 'Lt Cdr' });
  usersCache.dd        = await upsertUser('dd@dp.navy',         'DD — DP Office',       [Role.DD],              ['DP-OFFICE'],   { rank: 'Cdr' });
  usersCache.dpn       = await upsertUser('dpn@dp.navy',        'DP(N)',                [Role.DP_N],            ['DP-OFFICE'],   { rank: 'Capt' });
  usersCache.dgdp      = await upsertUser('dgdp@dp.navy',       'DGDP',                 [Role.DGDP],            ['DP-OFFICE'],   { rank: 'Cdre' });
  usersCache.secydp    = await upsertUser('secydp@dp.navy',     'Secy DP',              [Role.SECY_DP],         ['DP-OFFICE'],   { rank: 'R Adm' });
  usersCache.cpo       = await upsertUser('cpo@dp.navy',        'CPO',                  [Role.CPO],             ['DP-OFFICE'],   { rank: 'Cdre' });
  usersCache.inspector = await upsertUser('inspector@dp.navy',  'Chief Inspector',      [Role.INSPECTORATE],    ['INSPECTORATE'],{ rank: 'Capt' });
  usersCache.inspector2= await upsertUser('inspector2@dp.navy', 'Dy Inspector',         [Role.INSPECTORATE],    ['INSPECTORATE']);

  usersCache.firm1Rep  = await upsertUser('rep@marine-systems.pk', 'Imran Ali',          [Role.FIRM_REP], [], { firmCode: 'F-001' });
  usersCache.firm2Rep  = await upsertUser('rep@naval-spares.pk',   'Ayesha Khan',        [Role.FIRM_REP], [], { firmCode: 'F-002' });
  usersCache.firm3Rep  = await upsertUser('rep@hamza-marine.pk',   'Zain Hamza',         [Role.FIRM_REP], [], { firmCode: 'F-003' });
  usersCache.firm4Rep  = await upsertUser('rep@pof.gov.pk',        'Capt (R) Tariq',     [Role.FIRM_REP], [], { firmCode: 'F-004' });
  usersCache.firm5Rep  = await upsertUser('rep@alkazim.pk',        'Nadia Rafiq',        [Role.FIRM_REP], [], { firmCode: 'F-005' });

  // -------------------------------------------------------------------------
  // Indent scenarios — one block per workflow state
  // -------------------------------------------------------------------------
  console.log('[seed] indent scenarios…');
  const FY = fyCurrent.id;
  let serial = 0;
  const nextIn = () => `IND/2026/${String(++serial).padStart(5, '0')}`;
  const nextCtrl = (adp: string) => `CTRL-${adp}-${String(serial).padStart(4, '0')}`;

  // --- DRAFT (2) ---
  for (let i = 0; i < 2; i++) {
    await createIndent(
      {
        indentNumber: nextIn(),
        subject: ['Fire-fighting pumps for PNS Zulfiquar', 'Replacement sonar cables (DRAFT)'][i]!,
        indenterKey: i === 0 ? 'indenter' : 'indenter2',
        sectionCode: i === 0 ? 'FLEET-HQ' : 'FLEET-KHI',
        budgetHeadCode: ['NAVY-ENG', 'NAVY-COMMS'][i]!,
        status: IndentStatus.DRAFT,
        items: [
          { description: 'Centrifugal pump assembly 3-inch', qty: 2, uom: 'EA', unitPrice: '185000.00' },
          { description: 'Spare impeller kit', qty: 4, uom: 'EA', unitPrice: '22500.00' },
        ],
        submittedDaysAgo: 1,
      },
      usersCache, secCache, bhMap, FY,
    );
  }

  // --- SUBMITTED (1), CR_RECEIVED (1), BUDGET_CHECK (1) ---
  await createIndent({
    indentNumber: nextIn(), subject: 'Diesel engine overhaul kits for PNS Shamsheer',
    indenterKey: 'indenter', sectionCode: 'FLEET-HQ', budgetHeadCode: 'NAVY-ENG',
    status: IndentStatus.SUBMITTED,
    items: [{ description: 'Caterpillar 3516 overhaul kit', qty: 3, uom: 'KIT', unitPrice: '2850000.00' }],
    submittedDaysAgo: 2,
  }, usersCache, secCache, bhMap, FY);

  await createIndent({
    indentNumber: nextIn(), subject: 'Navigation radar antenna assemblies',
    indenterKey: 'indenter2', sectionCode: 'FLEET-KHI', budgetHeadCode: 'NAVY-COMMS',
    status: IndentStatus.CR_RECEIVED,
    items: [{ description: 'X-band navigation antenna', qty: 2, uom: 'EA', unitPrice: '1250000.00' }],
    submittedDaysAgo: 4,
  }, usersCache, secCache, bhMap, FY);

  await createIndent({
    indentNumber: nextIn(), subject: 'Compressor spares — PNS Aslat',
    indenterKey: 'indenter3', sectionCode: 'FLEET-ORMARA', budgetHeadCode: 'NAVY-ENG',
    status: IndentStatus.BUDGET_CHECK,
    items: [{ description: 'HP air compressor rebuild kit', qty: 1, uom: 'KIT', unitPrice: '680000.00' }],
    submittedDaysAgo: 3,
  }, usersCache, secCache, bhMap, FY);

  // --- COORD_VETTING (1), ADP_VETTING (1), ADP_OBSERVED (1) ---
  await createIndent({
    indentNumber: nextIn(), subject: 'HF transceiver sets for destroyer squadron',
    indenterKey: 'indenter', sectionCode: 'FLEET-HQ', budgetHeadCode: 'NAVY-COMMS',
    status: IndentStatus.COORD_VETTING,
    items: [{ description: 'HF SSB transceiver 500W', qty: 4, uom: 'EA', unitPrice: '950000.00' }],
    submittedDaysAgo: 6,
  }, usersCache, secCache, bhMap, FY);

  const adpVet = await createIndent({
    indentNumber: nextIn(), subject: 'Mine-counter-measure diving suits',
    indenterKey: 'indenter2', sectionCode: 'FLEET-KHI', assignedAdpCode: 'ADP-2',
    budgetHeadCode: 'NAVY-MED',
    status: IndentStatus.ADP_VETTING,
    items: [{ description: 'MCM diving dry suit, Size L', qty: 6, uom: 'EA', unitPrice: '420000.00' }],
    submittedDaysAgo: 8,
  }, usersCache, secCache, bhMap, FY);
  void adpVet;

  const observed = await createIndent({
    indentNumber: nextIn(), subject: 'Replacement sonar transducer modules',
    indenterKey: 'indenter3', sectionCode: 'FLEET-ORMARA', assignedAdpCode: 'ADP-3',
    budgetHeadCode: 'NAVY-COMMS',
    status: IndentStatus.ADP_OBSERVED,
    items: [{ description: 'Low-frequency sonar transducer', qty: 2, uom: 'EA', unitPrice: '3800000.00' }],
    submittedDaysAgo: 10,
  }, usersCache, secCache, bhMap, FY);
  await prisma.observation.create({
    data: {
      id: ulid(),
      indentId: observed.indent.id,
      raisedByUserId: usersCache.adp3!.id,
      raisedToUserId: usersCache.indenter3!.id,
      note: 'Please attach the OEM compatibility certificate and clarify the mounting dimensions.',
      status: 'OPEN',
    },
  });

  // --- SUPTD_VETTING + INDENT_APPROVAL chains (partial, approved, rejected) ---
  const inApproval = await createIndent({
    indentNumber: nextIn(),
    controlNumber: nextCtrl('ADP1'),
    subject: 'Marine gas turbine inspection tools',
    indenterKey: 'indenter', sectionCode: 'FLEET-HQ', assignedAdpCode: 'ADP-1',
    budgetHeadCode: 'NAVY-ENG',
    status: IndentStatus.INDENT_APPROVAL,
    items: [{ description: 'Borescope probe set with lighting', qty: 1, uom: 'SET', unitPrice: '1850000.00' }],
    submittedDaysAgo: 12,
  }, usersCache, secCache, bhMap, FY);
  await makeApprovalChain(ApprovalSubject.INDENT, inApproval.indent.id,
    [Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP],
    1, // AD and DD have decided (approved), DP_N is pending
    ApprovalChainStatus.PENDING, usersCache);

  const inApprovalLate = await createIndent({
    indentNumber: nextIn(),
    controlNumber: nextCtrl('ADP2'),
    subject: 'Night-vision binoculars (bridge watch)',
    indenterKey: 'indenter2', sectionCode: 'FLEET-KHI', assignedAdpCode: 'ADP-2',
    budgetHeadCode: 'NAVY-WPN',
    status: IndentStatus.INDENT_APPROVAL,
    items: [{ description: 'Gen-III NVG binocular', qty: 12, uom: 'EA', unitPrice: '380000.00' }],
    submittedDaysAgo: 15,
  }, usersCache, secCache, bhMap, FY);
  await makeApprovalChain(ApprovalSubject.INDENT, inApprovalLate.indent.id,
    [Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP],
    3, // AD..DGDP decided, Secy DP pending (final step)
    ApprovalChainStatus.PENDING, usersCache);

  const rejected = await createIndent({
    indentNumber: nextIn(),
    controlNumber: nextCtrl('ADP1'),
    subject: 'Diving reel equipment (duplicate request)',
    indenterKey: 'indenter', sectionCode: 'FLEET-HQ', assignedAdpCode: 'ADP-1',
    budgetHeadCode: 'NAVY-MED',
    status: IndentStatus.INDENT_REJECTED,
    items: [{ description: 'Dive reel 100m', qty: 20, uom: 'EA', unitPrice: '28000.00' }],
    submittedDaysAgo: 25, closedDaysAgo: 10,
  }, usersCache, secCache, bhMap, FY);
  await makeApprovalChain(ApprovalSubject.INDENT, rejected.indent.id,
    [Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP],
    1, // AD approved, DD rejected
    ApprovalChainStatus.REJECTED, usersCache);

  // --- IT_PREPARATION, IT_APPROVAL, IT_DISPATCHED ---
  const itPrep = await createIndent({
    indentNumber: nextIn(),
    controlNumber: nextCtrl('ADP1'),
    subject: 'Chilled water plants for frigate',
    indenterKey: 'indenter', sectionCode: 'FLEET-HQ', assignedAdpCode: 'ADP-1',
    budgetHeadCode: 'NAVY-HULL',
    status: IndentStatus.IT_PREPARATION,
    items: [{ description: '150-ton chilled water plant', qty: 2, uom: 'EA', unitPrice: '18500000.00' }],
    submittedDaysAgo: 20,
  }, usersCache, secCache, bhMap, FY);
  await makeApprovalChain(ApprovalSubject.INDENT, itPrep.indent.id,
    [Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP], 4,
    ApprovalChainStatus.APPROVED, usersCache);

  const itInApproval = await makeFullyApprovedIndentWithIT(
    nextIn(), nextCtrl('ADP2'),
    'Combat Management System spares', 'indenter2', 'FLEET-KHI', 'ADP-2', 'NAVY-COMMS',
    [{ description: 'CMS console display 24-inch', qty: 3, uom: 'EA', unitPrice: '2200000.00' }],
    IndentStatus.IT_APPROVAL, ITStatus.IN_APPROVAL,
    ['F-001', 'F-005', 'F-008'],
    usersCache, secCache, bhMap, FY,
  );
  // Chain #2 (IT approval): AD approved, DD pending
  await makeApprovalChain(ApprovalSubject.IT_PROFORMA, itInApproval.itPerformaId!,
    [Role.AD, Role.DD, Role.DP_N], 0, ApprovalChainStatus.PENDING, usersCache);

  const itDispatched1 = await makeFullyApprovedIndentWithIT(
    nextIn(), nextCtrl('ADP1'),
    'Hull paint & coatings (annual)', 'indenter3', 'FLEET-ORMARA', 'ADP-1', 'NAVY-HULL',
    [
      { description: 'Marine anti-fouling paint 20L', qty: 400, uom: 'DRUM', unitPrice: '18500.00' },
      { description: 'Primer undercoat 20L', qty: 300, uom: 'DRUM', unitPrice: '9800.00' },
    ],
    IndentStatus.IT_DISPATCHED, ITStatus.DISPATCHED,
    ['F-001', 'F-003', 'F-006', 'F-010'],
    usersCache, secCache, bhMap, FY,
  );
  await makeApprovalChain(ApprovalSubject.IT_PROFORMA, itDispatched1.itPerformaId!,
    [Role.AD, Role.DD, Role.DP_N], 2, ApprovalChainStatus.APPROVED, usersCache);

  // --- TECH_OFFERS_OPEN: IT dispatched + offers coming in ---
  const techOpen = await makeFullyApprovedIndentWithIT(
    nextIn(), nextCtrl('ADP2'),
    'Torpedo handling trolleys', 'indenter2', 'FLEET-KHI', 'ADP-2', 'NAVY-WPN',
    [{ description: 'Lightweight torpedo trolley, SS', qty: 10, uom: 'EA', unitPrice: '640000.00' }],
    IndentStatus.TECH_OFFERS_OPEN, ITStatus.DISPATCHED,
    ['F-002', 'F-004', 'F-010'],
    usersCache, secCache, bhMap, FY,
  );
  await makeApprovalChain(ApprovalSubject.IT_PROFORMA, techOpen.itPerformaId!,
    [Role.AD, Role.DD, Role.DP_N], 2, ApprovalChainStatus.APPROVED, usersCache);
  for (const firmCode of ['F-002', 'F-004'] as const) {
    await prisma.technicalOffer.create({
      data: {
        id: ulid(),
        itPerformaId: techOpen.itPerformaId!,
        firmId: firmCache[firmCode]!.id,
        documentKey: `s3://offers/${firmCode}/${techOpen.indent.indentNumber}.pdf`,
        status: OfferStatus.RECEIVED,
      },
    });
  }

  // --- TSR_IN_PROGRESS with evaluations + a query ---
  const tsrIP = await makeFullyApprovedIndentWithIT(
    nextIn(), nextCtrl('ADP3'),
    'Satellite communication terminals', 'indenter', 'FLEET-HQ', 'ADP-3', 'NAVY-COMMS',
    [{ description: 'VSAT Ku-band terminal, maritime', qty: 2, uom: 'EA', unitPrice: '8800000.00' }],
    IndentStatus.TSR_IN_PROGRESS, ITStatus.DISPATCHED,
    ['F-005', 'F-008', 'F-009'],
    usersCache, secCache, bhMap, FY,
  );
  await makeApprovalChain(ApprovalSubject.IT_PROFORMA, tsrIP.itPerformaId!,
    [Role.AD, Role.DD, Role.DP_N], 2, ApprovalChainStatus.APPROVED, usersCache);
  const tsrOffers: { id: string; firmCode: string }[] = [];
  for (const firmCode of ['F-005', 'F-008', 'F-009'] as const) {
    const o = await prisma.technicalOffer.create({
      data: {
        id: ulid(),
        itPerformaId: tsrIP.itPerformaId!,
        firmId: firmCache[firmCode]!.id,
        documentKey: `s3://offers/${firmCode}/${tsrIP.indent.indentNumber}.pdf`,
        status: OfferStatus.UNDER_REVIEW,
      },
    });
    tsrOffers.push({ id: o.id, firmCode });
  }
  const tsrId = ulid();
  await prisma.technicalScrutinyReport.create({
    data: {
      id: tsrId,
      itPerformaId: tsrIP.itPerformaId!,
      inspectorateUserId: usersCache.inspector!.id,
      status: TSRStatus.QUERIES_RAISED,
      summary: null,
    },
  });
  // Two evaluated, one needs query
  const verdicts: Record<string, TSRVerdict> = {
    'F-005': TSRVerdict.ACCEPTED,
    'F-008': TSRVerdict.ACCEPTED,
    'F-009': TSRVerdict.NEEDS_QUERY,
  };
  for (const o of tsrOffers) {
    await prisma.tSREvaluation.create({
      data: {
        id: ulid(),
        tsrId,
        technicalOfferId: o.id,
        verdict: verdicts[o.firmCode]!,
        remarks: verdicts[o.firmCode] === TSRVerdict.ACCEPTED ? 'Specs meet requirement.' : 'Need clarification on L-band support.',
      },
    });
  }
  await prisma.tSRQuery.create({
    data: {
      id: ulid(),
      tsrId,
      firmId: firmCache['F-009']!.id,
      question: 'Please confirm whether the proposed terminal supports L-band fallback and provide power consumption at 24V.',
      status: 'OPEN',
    },
  });

  // --- COMMERCIAL_OPEN with offers opened ---
  const commOpen = await makeFullyApprovedIndentWithIT(
    nextIn(), nextCtrl('ADP1'),
    'Fuel transfer pumps', 'indenter3', 'FLEET-ORMARA', 'ADP-1', 'NAVY-ENG',
    [{ description: 'HFO transfer pump 50 m³/h', qty: 4, uom: 'EA', unitPrice: '1250000.00' }],
    IndentStatus.COMMERCIAL_OPEN, ITStatus.DISPATCHED,
    ['F-001', 'F-003', 'F-006'],
    usersCache, secCache, bhMap, FY,
  );
  await makeApprovalChain(ApprovalSubject.IT_PROFORMA, commOpen.itPerformaId!,
    [Role.AD, Role.DD, Role.DP_N], 2, ApprovalChainStatus.APPROVED, usersCache);
  const commTechIds: Record<string, string> = {};
  for (const firmCode of ['F-001', 'F-003', 'F-006'] as const) {
    const t = await prisma.technicalOffer.create({
      data: { id: ulid(), itPerformaId: commOpen.itPerformaId!, firmId: firmCache[firmCode]!.id, status: OfferStatus.ACCEPTED, documentKey: `s3://offers/${firmCode}/tech.pdf` },
    });
    commTechIds[firmCode] = t.id;
  }
  const commPrices: Record<string, string> = { 'F-001': '4950000.00', 'F-003': '5100000.00', 'F-006': '5300000.00' };
  for (const firmCode of ['F-001', 'F-003', 'F-006'] as const) {
    await prisma.commercialOffer.create({
      data: {
        id: ulid(),
        itPerformaId: commOpen.itPerformaId!,
        firmId: firmCache[firmCode]!.id,
        totalPrice: minorToDecimal(decimalToMinor(commPrices[firmCode]!)),
        currency: 'PKR',
        deliveryWeeks: firmCode === 'F-001' ? 10 : firmCode === 'F-003' ? 14 : 16,
        status: OfferStatus.RECEIVED,
      },
    });
  }

  // --- CST_PREPARATION: CST drafted ---
  const cstPrep = await makeFullyApprovedIndentWithIT(
    nextIn(), nextCtrl('ADP2'),
    'Decoy launcher reload kits', 'indenter2', 'FLEET-KHI', 'ADP-2', 'NAVY-WPN',
    [{ description: 'Soft-kill decoy reload kit', qty: 20, uom: 'KIT', unitPrice: '320000.00' }],
    IndentStatus.CST_PREPARATION, ITStatus.DISPATCHED,
    ['F-004', 'F-010'],
    usersCache, secCache, bhMap, FY,
  );
  await makeApprovalChain(ApprovalSubject.IT_PROFORMA, cstPrep.itPerformaId!,
    [Role.AD, Role.DD, Role.DP_N], 2, ApprovalChainStatus.APPROVED, usersCache);
  const cstPrepOffers: { firmCode: string; id: string; price: string }[] = [];
  for (const [firmCode, price] of [['F-004', '6100000.00'], ['F-010', '6450000.00']] as const) {
    const t = await prisma.technicalOffer.create({
      data: { id: ulid(), itPerformaId: cstPrep.itPerformaId!, firmId: firmCache[firmCode]!.id, status: OfferStatus.ACCEPTED },
    });
    void t;
    const c = await prisma.commercialOffer.create({
      data: {
        id: ulid(),
        itPerformaId: cstPrep.itPerformaId!,
        firmId: firmCache[firmCode]!.id,
        totalPrice: minorToDecimal(decimalToMinor(price)),
        currency: 'PKR',
        deliveryWeeks: 12,
        status: OfferStatus.UNDER_REVIEW,
      },
    });
    cstPrepOffers.push({ firmCode, id: c.id, price });
  }
  const cstPrepId = ulid();
  await prisma.cST.create({
    data: {
      id: cstPrepId,
      itPerformaId: cstPrep.itPerformaId!,
      preparedByUserId: usersCache.adp2!.id,
      status: CSTStatus.DRAFT,
      singleQuote: false,
    },
  });
  for (let i = 0; i < cstPrepOffers.length; i++) {
    const o = cstPrepOffers[i]!;
    await prisma.cSTLine.create({
      data: {
        id: ulid(),
        cstId: cstPrepId,
        commercialOfferId: o.id,
        rank: i + 1,
        recommendedForAward: i === 0,
        justification: i === 0 ? 'Lowest responsive bidder meeting all technical requirements.' : null,
      },
    });
  }

  // --- CST_APPROVAL ---
  const cstApp = await makeFullyApprovedIndentWithIT(
    nextIn(), nextCtrl('ADP3'),
    'Shipboard IFF transponders', 'indenter', 'FLEET-HQ', 'ADP-3', 'NAVY-COMMS',
    [{ description: 'IFF Mk XIIA transponder', qty: 3, uom: 'EA', unitPrice: '4200000.00' }],
    IndentStatus.CST_APPROVAL, ITStatus.DISPATCHED,
    ['F-008', 'F-009'],
    usersCache, secCache, bhMap, FY,
  );
  await makeApprovalChain(ApprovalSubject.IT_PROFORMA, cstApp.itPerformaId!,
    [Role.AD, Role.DD, Role.DP_N], 2, ApprovalChainStatus.APPROVED, usersCache);
  const cstAppOffers: { firmCode: string; cid: string; price: string }[] = [];
  for (const [firmCode, price] of [['F-008', '13100000.00'], ['F-009', '13550000.00']] as const) {
    await prisma.technicalOffer.create({
      data: { id: ulid(), itPerformaId: cstApp.itPerformaId!, firmId: firmCache[firmCode]!.id, status: OfferStatus.ACCEPTED },
    });
    const c = await prisma.commercialOffer.create({
      data: {
        id: ulid(),
        itPerformaId: cstApp.itPerformaId!,
        firmId: firmCache[firmCode]!.id,
        totalPrice: minorToDecimal(decimalToMinor(price)),
        currency: 'PKR',
        deliveryWeeks: 20,
        status: OfferStatus.UNDER_REVIEW,
      },
    });
    cstAppOffers.push({ firmCode, cid: c.id, price });
  }
  const cstAppId = ulid();
  await prisma.cST.create({
    data: {
      id: cstAppId, itPerformaId: cstApp.itPerformaId!,
      preparedByUserId: usersCache.adp3!.id,
      status: CSTStatus.IN_APPROVAL, singleQuote: false,
    },
  });
  for (let i = 0; i < cstAppOffers.length; i++) {
    await prisma.cSTLine.create({
      data: { id: ulid(), cstId: cstAppId, commercialOfferId: cstAppOffers[i]!.cid, rank: i + 1, recommendedForAward: i === 0 },
    });
  }
  // CST chain: AD approved, DD pending
  await makeApprovalChain(ApprovalSubject.CST, cstAppId, [Role.AD, Role.DD], 0, ApprovalChainStatus.PENDING, usersCache);

  // --- PR_ISSUED (2) ---
  for (let n = 0; n < 2; n++) {
    const prIssued = await makeFullyApprovedIndentWithIT(
      nextIn(),
      nextCtrl(n === 0 ? 'ADP1' : 'ADP2'),
      n === 0 ? 'Life rafts (SOLAS-A)' : 'Replacement generator alternators',
      n === 0 ? 'indenter3' : 'indenter2',
      n === 0 ? 'FLEET-ORMARA' : 'FLEET-KHI',
      n === 0 ? 'ADP-1' : 'ADP-2',
      n === 0 ? 'NAVY-MED' : 'NAVY-ENG',
      n === 0
        ? [{ description: '25-man life raft, SOLAS A-pack', qty: 15, uom: 'EA', unitPrice: '480000.00' }]
        : [{ description: 'Stamford HCI534C alternator', qty: 2, uom: 'EA', unitPrice: '3850000.00' }],
      IndentStatus.PR_ISSUED, ITStatus.CLOSED,
      n === 0 ? ['F-001', 'F-002'] : ['F-003', 'F-007'],
      usersCache, secCache, bhMap, FY,
    );
    await makeApprovalChain(ApprovalSubject.IT_PROFORMA, prIssued.itPerformaId!,
      [Role.AD, Role.DD, Role.DP_N], 2, ApprovalChainStatus.APPROVED, usersCache);
    const winnerFirm = n === 0 ? 'F-001' : 'F-003';
    const price = n === 0 ? '7200000.00' : '7700000.00';
    const otherFirm = n === 0 ? 'F-002' : 'F-007';
    const otherPrice = n === 0 ? '7450000.00' : '7900000.00';
    for (const [f, p, acc] of [[winnerFirm, price, true], [otherFirm, otherPrice, false]] as const) {
      await prisma.technicalOffer.create({
        data: { id: ulid(), itPerformaId: prIssued.itPerformaId!, firmId: firmCache[f]!.id, status: OfferStatus.ACCEPTED },
      });
      void acc;
      await prisma.commercialOffer.create({
        data: {
          id: ulid(), itPerformaId: prIssued.itPerformaId!, firmId: firmCache[f]!.id,
          totalPrice: minorToDecimal(decimalToMinor(p)), currency: 'PKR', deliveryWeeks: 14,
          status: OfferStatus.ACCEPTED,
        },
      });
    }
    const [winOff, loseOff] = await prisma.commercialOffer.findMany({
      where: { itPerformaId: prIssued.itPerformaId! }, orderBy: { totalPrice: 'asc' }, take: 2,
    });
    const prCstId = ulid();
    await prisma.cST.create({
      data: {
        id: prCstId, itPerformaId: prIssued.itPerformaId!,
        preparedByUserId: usersCache.adp1!.id,
        status: CSTStatus.APPROVED, singleQuote: false, approvedAt: new Date(Date.now() - 3 * 86_400_000),
      },
    });
    await prisma.cSTLine.create({
      data: { id: ulid(), cstId: prCstId, commercialOfferId: winOff!.id, rank: 1, recommendedForAward: true, justification: 'Lowest price, delivery within window.' },
    });
    await prisma.cSTLine.create({
      data: { id: ulid(), cstId: prCstId, commercialOfferId: loseOff!.id, rank: 2, recommendedForAward: false },
    });
    await makeApprovalChain(ApprovalSubject.CST, prCstId, [Role.AD, Role.DD], 1, ApprovalChainStatus.APPROVED, usersCache);
    await prisma.purchaseRequisition.create({
      data: {
        id: ulid(),
        cstId: prCstId,
        firmId: firmCache[winnerFirm]!.id,
        prNumber: `PR/2026/${String(1000 + n).padStart(5, '0')}`,
        amount: minorToDecimal(decimalToMinor(price)),
        currency: 'PKR',
        status: PRStatus.SENT,
        faxedAt: new Date(Date.now() - 2 * 86_400_000),
      },
    });
  }

  // --- CLOSED (2) ---
  for (let n = 0; n < 2; n++) {
    const closed = await makeFullyApprovedIndentWithIT(
      nextIn(),
      nextCtrl('ADP1'),
      n === 0 ? 'Boiler feedwater pump overhaul' : 'Signal flag set (regulation)',
      n === 0 ? 'indenter' : 'indenter3',
      n === 0 ? 'FLEET-HQ' : 'FLEET-ORMARA',
      'ADP-1',
      n === 0 ? 'NAVY-ENG' : 'NAVY-CLOTH',
      n === 0
        ? [{ description: 'Feedwater pump complete overhaul', qty: 2, uom: 'EA', unitPrice: '890000.00' }]
        : [{ description: 'Full signal flag set, nylon', qty: 8, uom: 'SET', unitPrice: '45000.00' }],
      IndentStatus.CLOSED, ITStatus.CLOSED,
      ['F-006', 'F-010'],
      usersCache, secCache, bhMap, FY,
    );
    await makeApprovalChain(ApprovalSubject.IT_PROFORMA, closed.itPerformaId!,
      [Role.AD, Role.DD, Role.DP_N], 2, ApprovalChainStatus.APPROVED, usersCache);
    const winner = n === 0 ? 'F-006' : 'F-010';
    const price = n === 0 ? '1950000.00' : '420000.00';
    for (const f of [winner, winner === 'F-006' ? 'F-010' : 'F-006']) {
      await prisma.technicalOffer.create({
        data: { id: ulid(), itPerformaId: closed.itPerformaId!, firmId: firmCache[f]!.id, status: OfferStatus.ACCEPTED },
      });
      await prisma.commercialOffer.create({
        data: {
          id: ulid(), itPerformaId: closed.itPerformaId!, firmId: firmCache[f]!.id,
          totalPrice: minorToDecimal(decimalToMinor(f === winner ? price : minorToDecimal(decimalToMinor(price) + 50_0000n))),
          currency: 'PKR', deliveryWeeks: 10, status: OfferStatus.ACCEPTED,
        },
      });
    }
    const closedOffers = await prisma.commercialOffer.findMany({ where: { itPerformaId: closed.itPerformaId! }, orderBy: { totalPrice: 'asc' } });
    const closedCstId = ulid();
    await prisma.cST.create({
      data: { id: closedCstId, itPerformaId: closed.itPerformaId!, preparedByUserId: usersCache.adp1!.id, status: CSTStatus.APPROVED, singleQuote: false, approvedAt: new Date(Date.now() - 20 * 86_400_000) },
    });
    for (let i = 0; i < closedOffers.length; i++) {
      await prisma.cSTLine.create({
        data: { id: ulid(), cstId: closedCstId, commercialOfferId: closedOffers[i]!.id, rank: i + 1, recommendedForAward: i === 0 },
      });
    }
    await makeApprovalChain(ApprovalSubject.CST, closedCstId, [Role.AD, Role.DD], 1, ApprovalChainStatus.APPROVED, usersCache);
    await prisma.purchaseRequisition.create({
      data: {
        id: ulid(), cstId: closedCstId, firmId: firmCache[winner]!.id,
        prNumber: `PR/2026/${String(2000 + n).padStart(5, '0')}`,
        amount: minorToDecimal(decimalToMinor(price)), currency: 'PKR',
        status: PRStatus.CLOSED,
        faxedAt: new Date(Date.now() - 18 * 86_400_000),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Final audit noise so the dashboards are non-empty
  // -------------------------------------------------------------------------
  const sampleEvents = ['indent.submitted', 'indent.status.changed', 'approval.step.decided', 'it.dispatched', 'tsr.evaluation.recorded'];
  const recentIndents = await prisma.indent.findMany({ take: 20, orderBy: { createdAt: 'desc' }, select: { id: true } });
  for (const i of recentIndents) {
    for (let j = 0; j < 2; j++) {
      await prisma.auditLog.create({
        data: {
          id: ulid(), actorUserId: usersCache.adp1!.id,
          action: sampleEvents[(i.id.charCodeAt(0) + j) % sampleEvents.length]!,
          subjectType: 'INDENT', subjectId: i.id,
          metadata: { seed: true } as Prisma.InputJsonValue,
        },
      });
    }
  }

  console.log('[seed] done.');
  const counts = {
    users: await prisma.user.count(),
    sections: await prisma.section.count(),
    firms: await prisma.firm.count(),
    indents: await prisma.indent.count(),
    itProformas: await prisma.iTPerforma.count(),
    chains: await prisma.approvalChain.count(),
    tsrs: await prisma.technicalScrutinyReport.count(),
    csts: await prisma.cST.count(),
    prs: await prisma.purchaseRequisition.count(),
  };
  console.log('[seed] counts', counts);
}

// -----------------------------------------------------------------------------
// Composite helper — create an indent whose IT-approval chain has already
// terminated APPROVED, with an ITPerforma in a specific status.
// -----------------------------------------------------------------------------
async function makeFullyApprovedIndentWithIT(
  indentNumber: string,
  controlNumber: string,
  subject: string,
  indenterKey: string,
  sectionCode: string,
  adpCode: string,
  budgetHeadCode: string,
  items: readonly { description: string; qty: number; uom: string; unitPrice: string }[],
  finalStatus: IndentStatus,
  itStatus: ITStatus,
  invitedFirmCodes: readonly string[],
  users: UserCache,
  sections: SectionCache,
  bhMap: Record<string, string>,
  fyId: string,
): Promise<IndentCtx> {
  const ctx = await createIndent({
    indentNumber,
    controlNumber,
    subject,
    indenterKey,
    sectionCode,
    assignedAdpCode: adpCode,
    budgetHeadCode,
    status: finalStatus,
    items,
    submittedDaysAgo: 30,
  }, users, sections, bhMap, fyId);
  // Chain #1 — indent approval (APPROVED)
  await makeApprovalChain(
    ApprovalSubject.INDENT, ctx.indent.id,
    [Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP], 4,
    ApprovalChainStatus.APPROVED, users,
  );
  // IT proforma
  const itId = ulid();
  const dispatched = itStatus === ITStatus.DISPATCHED || itStatus === ITStatus.CLOSED;
  const now = new Date();
  await prisma.iTPerforma.create({
    data: {
      id: itId,
      indentId: ctx.indent.id,
      reference: `IT/2026/${indentNumber.split('/')[2]}`,
      preparedByUserId: users[adpCode === 'ADP-1' ? 'adp1' : adpCode === 'ADP-2' ? 'adp2' : 'adp3']!.id,
      status: itStatus,
      checklist: { completeness: true, budgetVerified: true } as Prisma.InputJsonValue,
      dispatchedAt: dispatched ? new Date(now.getTime() - 10 * 86_400_000) : null,
      closingAt: dispatched ? new Date(now.getTime() + 10 * 86_400_000) : null,
      firms: {
        create: await Promise.all(invitedFirmCodes.map(async (c) => {
          const f = await prisma.firm.findUnique({ where: { code: c }, select: { id: true } });
          if (!f) throw new Error(`Firm ${c} not found`);
          return { firmId: f.id };
        })),
      },
    },
  });
  return { ...ctx, itPerformaId: itId };
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
