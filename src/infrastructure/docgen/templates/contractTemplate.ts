import type { DocTemplate } from '../DocxBuilder';

/**
 * Contract template — SKELETON. Owner: Fahad.
 * Fill in the real fields + layout from the v4.4.1 manual. Keep the shape:
 * a plain data interface + a DocTemplate built from DocBlocks.
 */
export interface ContractDocData {
  readonly reference: string;
  readonly subject: string;
}

export const contractTemplate: DocTemplate<ContractDocData> = {
  title: () => 'Contract',
  fileName: (d) => `Contract_${d.reference}`,
  blocks: (d) => [
    {
      kind: 'keyValue',
      rows: [
        ['Reference', d.reference],
        ['Subject', d.subject],
      ],
    },
    { kind: 'paragraph', text: 'Template not yet finalised (Fahad).', italic: true },
  ],
};
