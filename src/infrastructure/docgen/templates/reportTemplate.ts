import type { DocBlock, DocTemplate } from '../DocxBuilder';

/**
 * Generic table report template (Z9 — Reporting Phase 1). Every report page
 * exports through this: a filters key/value block, then one heading + table
 * per section. Values arrive pre-formatted as strings.
 */
export interface ReportDocSection {
  readonly heading: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly note?: string;
}

export interface ReportDocData {
  readonly title: string;
  /** Download file name, without extension. */
  readonly fileName: string;
  readonly filters: readonly (readonly [label: string, value: string])[];
  readonly sections: readonly ReportDocSection[];
}

export const reportTemplate: DocTemplate<ReportDocData> = {
  title: (d) => d.title,
  fileName: (d) => d.fileName,
  blocks: (d) => {
    const blocks: DocBlock[] = [
      { kind: 'heading', text: 'Filters', level: 2 },
      { kind: 'keyValue', rows: d.filters.length ? d.filters : [['Filters', 'None']] },
    ];
    for (const s of d.sections) {
      blocks.push({ kind: 'heading', text: s.heading, level: 2 });
      blocks.push({ kind: 'table', headers: s.headers, rows: s.rows });
      if (s.note) blocks.push({ kind: 'paragraph', text: s.note, italic: true });
    }
    return blocks;
  },
};
