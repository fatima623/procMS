/**
 * RFC-4180-ish CSV parser. Zero deps. Handles quoted fields, embedded
 * commas, embedded newlines, `""` escapes. Not a stream — reads the whole
 * string into memory, which is fine for the admin bulk-import use-case.
 */

export interface CsvParseResult {
  readonly headers: readonly string[];
  readonly rows: readonly Record<string, string>[];
}

export function parseCsv(input: string): CsvParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  // Strip UTF-8 BOM if present.
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);

  const pushCell = () => { row.push(cell); cell = ''; };
  const pushRow = () => {
    // Skip trailing empty rows.
    if (row.length === 1 && row[0] === '') { row = []; return; }
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const ch = input[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      cell += ch; i += 1; continue;
    }
    if (ch === '"') { inQuotes = true; i += 1; continue; }
    if (ch === ',') { pushCell(); i += 1; continue; }
    if (ch === '\r') { i += 1; continue; }
    if (ch === '\n') { pushCell(); pushRow(); i += 1; continue; }
    cell += ch; i += 1;
  }
  // Flush last cell/row.
  if (cell !== '' || row.length > 0) { pushCell(); pushRow(); }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0]!.map((h) => h.trim());
  const dataRows = rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]!] = (r[c] ?? '').trim();
    return obj;
  });
  return { headers, rows: dataRows };
}
