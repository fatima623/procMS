import type { DocTemplate } from '../DocxBuilder';

/**
 * Purchase Requisition template — SKELETON. Owner: Mustafa.
 * Fill in the real fields + layout from the v4.4.1 manual. Keep the shape:
 * a plain data interface + a DocTemplate built from DocBlocks.
 */
export interface PRDocData {
  readonly reference: string;
  readonly subject: string;
}

export const prTemplate: DocTemplate<PRDocData> = {
  title: () => 'Purchase Requisition',
  fileName: (d) => `PR_${d.reference}`,
  blocks: (d) => [
    {
      kind: 'keyValue',
      rows: [
        ['Reference', d.reference],
        ['Subject', d.subject],
      ],
    },
    { kind: 'paragraph', text: 'Template not yet finalised (Mustafa).', italic: true },
  ],
};
