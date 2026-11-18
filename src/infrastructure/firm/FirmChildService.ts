import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError } from '@/domain/errors/DomainError';
import type {
  FirmFinancialInput,
  CreateFirmItemInput,
  UpdateFirmItemInput,
  CreateFirmSignatoryInput,
  UpdateFirmSignatoryInput,
  CreateFirmPartnerInput,
  UpdateFirmPartnerInput,
  CreateFirmAgentInput,
  UpdateFirmAgentInput,
  CreateFirmDisciplineInput,
  UpdateFirmDisciplineInput,
} from '@/interfaces/http/schemas/firm';

/**
 * FirmChildService: CRUD for the firm detail tabs
 * (Financial / Items / Signatories / Partners / Agent / Discipline).
 * Every method checks the firm exists, and that a child row belongs to
 * the firm in the URL, before touching it.
 */

async function assertFirm(firmId: string): Promise<void> {
  const firm = await prisma.firm.findUnique({ where: { id: firmId }, select: { id: true } });
  if (!firm) throw new NotFoundError('Firm', firmId);
}

export const firmChildService = {
  // --- Financial (one row per firm) ------------------------------------------
  async getFinancial(firmId: string) {
    await assertFirm(firmId);
    return prisma.firmFinancial.findUnique({ where: { firmId } });
  },

  async saveFinancial(firmId: string, input: FirmFinancialInput) {
    await assertFirm(firmId);
    return prisma.firmFinancial.upsert({
      where: { firmId },
      create: { id: ulid(), firmId, ...input },
      update: { ...input },
    });
  },

  // --- Items -----------------------------------------------------------------
  async listItems(firmId: string) {
    await assertFirm(firmId);
    return prisma.firmItemCatalog.findMany({ where: { firmId }, orderBy: { addedOn: 'desc' } });
  },

  async createItem(firmId: string, input: CreateFirmItemInput) {
    await assertFirm(firmId);
    return prisma.firmItemCatalog.create({ data: { id: ulid(), firmId, ...input } });
  },

  async updateItem(firmId: string, id: string, input: UpdateFirmItemInput) {
    const row = await prisma.firmItemCatalog.findFirst({ where: { id, firmId }, select: { id: true } });
    if (!row) throw new NotFoundError('FirmItemCatalog', id);
    return prisma.firmItemCatalog.update({ where: { id }, data: { ...input, version: { increment: 1 } } });
  },

  async deleteItem(firmId: string, id: string): Promise<void> {
    const row = await prisma.firmItemCatalog.findFirst({ where: { id, firmId }, select: { id: true } });
    if (!row) throw new NotFoundError('FirmItemCatalog', id);
    await prisma.firmItemCatalog.delete({ where: { id } });
  },

  // --- Signatories (never hard-deleted: contracts will refer to them) --------
  async listSignatories(firmId: string) {
    await assertFirm(firmId);
    return prisma.firmSignatory.findMany({ where: { firmId }, orderBy: { addedOn: 'desc' } });
  },

  async createSignatory(firmId: string, input: CreateFirmSignatoryInput) {
    await assertFirm(firmId);
    return prisma.firmSignatory.create({ data: { id: ulid(), firmId, ...input } });
  },

  async updateSignatory(firmId: string, id: string, input: UpdateFirmSignatoryInput) {
    const row = await prisma.firmSignatory.findFirst({ where: { id, firmId }, select: { id: true } });
    if (!row) throw new NotFoundError('FirmSignatory', id);
    return prisma.firmSignatory.update({ where: { id }, data: { ...input, version: { increment: 1 } } });
  },

  /** "Delete" = deactivate, so past contracts keep pointing at a real row. */
  async deactivateSignatory(firmId: string, id: string): Promise<void> {
    const row = await prisma.firmSignatory.findFirst({ where: { id, firmId }, select: { id: true } });
    if (!row) throw new NotFoundError('FirmSignatory', id);
    await prisma.firmSignatory.update({ where: { id }, data: { isActive: false, version: { increment: 1 } } });
  },

  // --- Partners --------------------------------------------------------------
  async listPartners(firmId: string) {
    await assertFirm(firmId);
    return prisma.firmPartner.findMany({ where: { firmId }, orderBy: { addedOn: 'desc' } });
  },

  async createPartner(firmId: string, input: CreateFirmPartnerInput) {
    await assertFirm(firmId);
    return prisma.firmPartner.create({ data: { id: ulid(), firmId, ...input } });
  },

  async updatePartner(firmId: string, id: string, input: UpdateFirmPartnerInput) {
    const row = await prisma.firmPartner.findFirst({ where: { id, firmId }, select: { id: true } });
    if (!row) throw new NotFoundError('FirmPartner', id);
    return prisma.firmPartner.update({ where: { id }, data: { ...input, version: { increment: 1 } } });
  },

  async deletePartner(firmId: string, id: string): Promise<void> {
    const row = await prisma.firmPartner.findFirst({ where: { id, firmId }, select: { id: true } });
    if (!row) throw new NotFoundError('FirmPartner', id);
    await prisma.firmPartner.delete({ where: { id } });
  },

  // --- Agents ----------------------------------------------------------------
  async listAgents(firmId: string) {
    await assertFirm(firmId);
    return prisma.firmAgent.findMany({ where: { firmId }, orderBy: { agreementFrom: 'desc' } });
  },

  async createAgent(firmId: string, input: CreateFirmAgentInput) {
    await assertFirm(firmId);
    return prisma.firmAgent.create({ data: { id: ulid(), firmId, ...input } });
  },

  async updateAgent(firmId: string, id: string, input: UpdateFirmAgentInput) {
    const row = await prisma.firmAgent.findFirst({ where: { id, firmId }, select: { id: true } });
    if (!row) throw new NotFoundError('FirmAgent', id);
    return prisma.firmAgent.update({ where: { id }, data: { ...input, version: { increment: 1 } } });
  },

  async deleteAgent(firmId: string, id: string): Promise<void> {
    const row = await prisma.firmAgent.findFirst({ where: { id, firmId }, select: { id: true } });
    if (!row) throw new NotFoundError('FirmAgent', id);
    await prisma.firmAgent.delete({ where: { id } });
  },

  // --- Discipline ------------------------------------------------------------
  async listDiscipline(firmId: string) {
    await assertFirm(firmId);
    return prisma.firmDisciplinaryAction.findMany({ where: { firmId }, orderBy: { issuedOn: 'desc' } });
  },

  async createDiscipline(firmId: string, issuedByUserId: string, input: CreateFirmDisciplineInput) {
    await assertFirm(firmId);
    return prisma.firmDisciplinaryAction.create({
      data: { id: ulid(), firmId, issuedByUserId, ...input },
    });
  },

  async updateDiscipline(firmId: string, id: string, input: UpdateFirmDisciplineInput) {
    const row = await prisma.firmDisciplinaryAction.findFirst({ where: { id, firmId }, select: { id: true } });
    if (!row) throw new NotFoundError('FirmDisciplinaryAction', id);
    return prisma.firmDisciplinaryAction.update({ where: { id }, data: { ...input, version: { increment: 1 } } });
  },

  async deleteDiscipline(firmId: string, id: string): Promise<void> {
    const row = await prisma.firmDisciplinaryAction.findFirst({ where: { id, firmId }, select: { id: true } });
    if (!row) throw new NotFoundError('FirmDisciplinaryAction', id);
    await prisma.firmDisciplinaryAction.delete({ where: { id } });
  },
};