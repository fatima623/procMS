import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError } from '@/domain/errors/DomainError';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreateServiceRecordInput,
  CreateLeaveInput,
  CreateHouseHiringInput,
  CreateDisciplinaryInput,
  BulkAttendanceInput,
} from '@/interfaces/http/schemas/hr';

export const employeeService = {
  async list(filter?: { section?: string; isActive?: boolean }) {
    return prisma.employee.findMany({
      where: {
        ...(filter?.section ? { section: filter.section } : {}),
        ...(filter?.isActive !== undefined ? { isActive: filter.isActive } : {}),
      },
      orderBy: [{ section: 'asc' }, { rank: 'asc' }],
    });
  },

  async get(id: string) {
    const row = await prisma.employee.findUnique({
      where: { id },
      include: {
        serviceRecords: { orderBy: { postingFrom: 'desc' } },
        leaves:         { orderBy: { fromDate: 'desc' } },
        houseHirings:   { orderBy: { hireStart: 'desc' } },
        disciplinaryActions: { orderBy: { issuedOn: 'desc' } },
      },
    });
    if (!row) throw new NotFoundError('Employee', id);
    return row;
  },

  async create(input: CreateEmployeeInput) {
    const id = ulid();
    await prisma.employee.create({
      data: {
        id,
        personnelNumber: input.personnelNumber,
        rank:            input.rank,
        designation:     input.designation,
        section:         input.section,
        dateOfJoining:   input.dateOfJoining,
        dateOfBirth:     input.dateOfBirth,
        bloodGroup:      input.bloodGroup ?? null,
        contact:         input.contact ?? null,
        maritalStatus:   input.maritalStatus ?? null,
      },
    });
    return { id };
  },

  async update(id: string, input: UpdateEmployeeInput) {
    const row = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
    if (!row) throw new NotFoundError('Employee', id);
    await prisma.employee.update({
      where: { id },
      data: {
        ...(input.personnelNumber !== undefined ? { personnelNumber: input.personnelNumber } : {}),
        ...(input.rank !== undefined ? { rank: input.rank } : {}),
        ...(input.designation !== undefined ? { designation: input.designation } : {}),
        ...(input.section !== undefined ? { section: input.section } : {}),
        ...(input.dateOfJoining !== undefined ? { dateOfJoining: input.dateOfJoining } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
        ...(input.bloodGroup !== undefined ? { bloodGroup: input.bloodGroup } : {}),
        ...(input.contact !== undefined ? { contact: input.contact } : {}),
        ...(input.maritalStatus !== undefined ? { maritalStatus: input.maritalStatus } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  },

  async addServiceRecord(employeeId: string, input: CreateServiceRecordInput) {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!emp) throw new NotFoundError('Employee', employeeId);
    const id = ulid();
    await prisma.employeeServiceRecord.create({
      data: {
        id,
        employeeId,
        postingFrom: input.postingFrom,
        postingTo:   input.postingTo ?? null,
        section:     input.section,
        remarks:     input.remarks ?? null,
      },
    });
    return { id };
  },

  async addLeave(employeeId: string, input: CreateLeaveInput) {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!emp) throw new NotFoundError('Employee', employeeId);
    const id = ulid();
    await prisma.employeeLeave.create({
      data: {
        id,
        employeeId,
        kind:     input.kind,
        fromDate: input.fromDate,
        toDate:   input.toDate,
        remarks:  input.remarks ?? null,
      },
    });
    return { id };
  },

  async addHouseHiring(employeeId: string, input: CreateHouseHiringInput) {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!emp) throw new NotFoundError('Employee', employeeId);
    const id = ulid();
    await prisma.employeeHouseHiring.create({
      data: {
        id,
        employeeId,
        address:          input.address,
        landlord:         input.landlord,
        monthlyRentMinor: input.monthlyRentMinor,
        currency:         input.currency ?? 'PKR',
        hireStart:        input.hireStart,
        hireEnd:          input.hireEnd ?? null,
      },
    });
    return { id };
  },

  async addDisciplinary(employeeId: string, input: CreateDisciplinaryInput) {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!emp) throw new NotFoundError('Employee', employeeId);
    const id = ulid();
    await prisma.employeeDisciplinaryAction.create({
      data: {
        id,
        employeeId,
        kind:      input.kind,
        issuedOn:  input.issuedOn,
        authority: input.authority,
        decision:  input.decision,
        remarks:   input.remarks ?? null,
      },
    });
    return { id };
  },

  async bulkMarkAttendance(userId: string, input: BulkAttendanceInput) {
    const records = input.employeeIds.map((employeeId) => ({
      id: ulid(),
      employeeId,
      kind: input.kind,
      fromDate: input.date,
      toDate: input.date,
      approvedByUserId: userId,
      remarks: input.remarks ?? null,
    }));
    await prisma.employeeLeave.createMany({
      data: records,
    });
    return { count: records.length };
  },

  async listAttendance(date: Date, section?: string) {
    return prisma.employeeLeave.findMany({
      where: {
        fromDate: { lte: date },
        toDate:   { gte: date },
        ...(section ? { employee: { section } } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            personnelNumber: true,
            rank: true,
            designation: true,
            section: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
