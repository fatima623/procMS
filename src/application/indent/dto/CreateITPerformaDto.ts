export interface CreateITPerformaDto {
  readonly indentId: string;
  readonly reference: string;                               // e.g. "IT/2026/00123"
  readonly checklist?: Record<string, unknown>;
  readonly invitedFirmIds: readonly string[];
}
