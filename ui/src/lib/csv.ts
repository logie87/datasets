import Papa from 'papaparse';
import type { Cell } from './types';

const MISSING = new Set(['', 'na', 'n/a', 'null', 'nan', 'none']);

export function parseCsv(text: string): { columns: string[]; rows: Cell[][] } {
	const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
	const [header, ...data] = result.data;
	if (!header) return { columns: [], rows: [] };
	const columns = header.map((c, i) => c?.trim() || `col_${i + 1}`);
	const rows = data.map((raw) =>
		columns.map((_, i) => {
			const v = raw[i];
			if (v === undefined) return null;
			const t = v.trim();
			return MISSING.has(t.toLowerCase()) ? null : t;
		})
	);
	return { columns, rows };
}

export function parseCsvRaw(text: string): { columns: string[]; rows: string[][] } {
	const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
	const [header, ...data] = result.data;
	if (!header) return { columns: [], rows: [] };
	const columns = header.map((c, i) => c?.trim() || `col_${i + 1}`);
	const rows = data.map((raw) => columns.map((_, i) => (raw[i] ?? '').toString()));
	return { columns, rows };
}

export function toCsv(columns: string[], rows: (string | null)[][]): string {
	return Papa.unparse({
		fields: columns,
		data: rows.map((r) => r.map((c) => (c === null ? '' : c)))
	});
}
