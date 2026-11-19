import { formatDate, formatMoneyMinor, orDash, type DocBlock, type DocTemplate } from '../DocxBuilder';

/**
 * Data the indent template needs. Shaped as a subset of `IndentDetailView`
 * (src/interfaces/ui/views/IndentViews.ts) so the route can pass that view
 * straight in, without this layer importing UI code.
 */
export interface IndentDocData {
  readonly indentNumber: string;
  readonly controlNumber: string | null;
  readonly subject: string;
  readonly justification: string | null;
  readonly type: string;
  readonly priority: string;
  readonly status: string;
  readonly estimatedValueMinor: string;
  readonly currency: string;
  readonly indenterName: string;
  readonly sectionName: string;
  readonly assignedAdpName: string | null;
  readonly fiscalYearLabel: string;
  readonly budgetHeadCode: string;
  readonly submittedAt: string | null;
  readonly createdAt: string;
  readonly items: readonly {
    readonly lineNo: number;
    readonly itemCode: string | null;
    readonly description: string;
    readonly quantity: string;
    readonly uom: string;
    readonly unitPriceMinor: string;
    readonly currency: string;
  }[];
  readonly chains: readonly {
    readonly subject: string;
    readonly status: string;
    readonly steps: readonly {
      readonly stepIndex: number;
      readonly role: string;
      readonly status: string;
      readonly decidedAt: string | null;
      readonly decidedByName: string | null;
      readonly comments: string | null;
    }[];
  }[];
}

export const indentTemplate: DocTemplate<IndentDocData> = {
  title: () => 'Indent File',
  fileName: (d) => `Indent_${d.indentNumber}`,
  blocks: (d) => {
    const blocks: DocBlock[] = [
      { kind: 'heading', text: 'Header' },
      {
        kind: 'keyValue',
        rows: [
          ['Indent number', d.indentNumber],
          ['Control number', orDash(d.controlNumber)],
          ['Subject', d.subject],
          ['Status', d.status],
          ['Type / Priority', `${d.type} / ${d.priority}`],
          ['Estimated value', formatMoneyMinor(d.estimatedValueMinor, d.currency)],
          ['Indenter', d.indenterName],
          ['Section', d.sectionName],
          ['Assigned ADP', orDash(d.assignedAdpName)],
          ['Fiscal year / Head', `${d.fiscalYearLabel} / ${d.budgetHeadCode}`],
          ['Created', formatDate(d.createdAt)],
          ['Submitted', formatDate(d.submittedAt)],
        ],
      },
    ];
    if (d.justification) {
      blocks.push({ kind: 'heading', text: 'Justification', level: 2 }, { kind: 'paragraph', text: d.justification });
    }
    blocks.push(
      { kind: 'heading', text: `Items (${d.items.length})` },
      {
        kind: 'table',
        headers: ['#', 'Item code', 'Description', 'Qty', 'UOM', 'Unit price'],
        rows: d.items.map((it) => [
          String(it.lineNo),
          orDash(it.itemCode),
          it.description,
          it.quantity,
          it.uom,
          formatMoneyMinor(it.unitPriceMinor, it.currency),
        ]),
      },
    );
    for (const chain of d.chains) {
      blocks.push(
        { kind: 'heading', text: `Approval chain — ${chain.subject} (${chain.status})`, level: 2 },
        {
          kind: 'table',
          headers: ['Step', 'Role', 'Decision', 'By', 'On', 'Comments'],
          rows: chain.steps.map((s) => [
            String(s.stepIndex + 1),
            s.role,
            s.status,
            orDash(s.decidedByName),
            formatDate(s.decidedAt),
            orDash(s.comments),
          ]),
        },
      );
    }
    blocks.push({ kind: 'signatures', roles: ['Indenter', 'ADP', 'SUPTD', 'DP(N)'] });
    return blocks;
  },
};
