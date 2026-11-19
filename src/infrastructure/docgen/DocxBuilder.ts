import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

/**
 * Shared Word (.docx) generation helper — Z1 in the v4.4.1 migration plan.
 *
 * Templates never import `docx` directly. They describe the document as a
 * list of plain `DocBlock`s; this builder turns the blocks into a real
 * Word file. That keeps every template (indent, PR, contract, CST, IT,
 * reports) small, testable, and consistent in look.
 *
 * PDF: not produced here. The chosen PDF strategy is the existing HTML
 * print view (e.g. /indents/[id]/print) + the browser's "Save as PDF".
 * No headless browser is shipped on the server.
 */

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type DocBlock =
  | { readonly kind: 'heading'; readonly text: string; readonly level?: 1 | 2 | 3 }
  | { readonly kind: 'paragraph'; readonly text: string; readonly bold?: boolean; readonly italic?: boolean }
  | { readonly kind: 'keyValue'; readonly rows: readonly (readonly [label: string, value: string])[] }
  | { readonly kind: 'table'; readonly headers: readonly string[]; readonly rows: readonly (readonly string[])[] }
  | { readonly kind: 'signatures'; readonly roles: readonly string[] }
  | { readonly kind: 'spacer' };

export interface DocTemplate<T> {
  /** Big title at the top of the document, e.g. "Indent File". */
  title(data: T): string;
  /** Download file name, without extension. Unsafe characters are replaced. */
  fileName(data: T): string;
  /** Body content. */
  blocks(data: T): DocBlock[];
}

export interface DocMeta {
  readonly organisation?: string;
  readonly generatedAt?: Date;
  readonly generatedBy?: string;
}

const DEFAULT_ORG = 'Directorate of Procurement — Navy (DP-N)';
const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: '999999' } as const;
const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Render a template + data into a .docx file buffer. */
export async function buildDocument<T>(template: DocTemplate<T>, data: T, meta: DocMeta = {}): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: meta.organisation ?? DEFAULT_ORG, size: 20, color: '555555' })],
    }),
    new Paragraph({ text: template.title(data), heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
  ];
  for (const block of template.blocks(data)) children.push(...renderBlock(block));

  const generatedAt = meta.generatedAt ?? new Date();
  const footerText = `Generated ${formatDate(generatedAt)}${meta.generatedBy ? ` by ${meta.generatedBy}` : ''} · Page `;

  const doc = new Document({
    creator: 'ProcMS',
    title: template.title(data),
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: footerText, size: 16, color: '777777' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '777777' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}

/** HTTP headers for a .docx download. */
export function docxResponseHeaders(fileName: string): Record<string, string> {
  const safe = safeFileName(fileName);
  return {
    'content-type': DOCX_MIME,
    'content-disposition': `attachment; filename="${safe}.docx"`,
    'cache-control': 'no-store',
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers — shared by every template
// ---------------------------------------------------------------------------

/** Money in this codebase is stored in 10^-4 units (see domain/shared/Money). */
export function formatMoneyMinor(amountMinor: string | bigint | number, currency: string): string {
  const minor = BigInt(amountMinor);
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / 10_000n;
  const cents = (abs % 10_000n) / 100n;
  const wholeText = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${wholeText}.${cents.toString().padStart(2, '0')} ${currency}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Unambiguous date like "05 Jan 2026" (ZeroLink parses this format). */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function orDash(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

export function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'document';
}

// ---------------------------------------------------------------------------
// Block rendering
// ---------------------------------------------------------------------------

function renderBlock(block: DocBlock): (Paragraph | Table)[] {
  switch (block.kind) {
    case 'heading':
      return [
        new Paragraph({
          text: block.text,
          heading: block.level === 3 ? HeadingLevel.HEADING_3 : block.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }),
      ];
    case 'paragraph':
      return [new Paragraph({ children: [new TextRun({ text: block.text, bold: block.bold, italics: block.italic })] })];
    case 'keyValue':
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: block.rows.map(
            ([label, value]) =>
              new TableRow({
                children: [cell(label, { bold: true, widthPct: 30, shade: true }), cell(value, { widthPct: 70 })],
              }),
          ),
        }),
      ];
    case 'table':
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: block.headers.map((h) => cell(h, { bold: true, shade: true })) }),
            ...(block.rows.length === 0
              ? [new TableRow({ children: [cell('No rows.', { span: Math.max(block.headers.length, 1) })] })]
              : block.rows.map((r) => new TableRow({ children: r.map((v) => cell(v)) }))),
          ],
        }),
      ];
    case 'signatures':
      return [
        new Paragraph({ text: '', spacing: { before: 480 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: block.roles.map(() => cell('\n\n____________________')) }),
            new TableRow({ children: block.roles.map((r) => cell(r, { bold: true })) }),
          ],
        }),
      ];
    case 'spacer':
      return [new Paragraph({ text: '' })];
  }
}

function cell(
  text: string,
  opts: { bold?: boolean; widthPct?: number; shade?: boolean; span?: number } = {},
): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    columnSpan: opts.span,
    width: opts.widthPct ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shade ? { fill: 'EEEEEE' } : undefined,
    children: text.split('\n').map((line) => new Paragraph({ children: [new TextRun({ text: line, bold: opts.bold })] })),
  });
}
