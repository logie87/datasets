import type { Cell } from '$lib/types';
import type { ServerDataset } from './store';

export function dropColumns(ds: ServerDataset, cols: string[]): ServerDataset {
	const drop = new Set(cols);
	const keepIdx = ds.columns.map((c, i) => (drop.has(c) ? -1 : i)).filter((i) => i >= 0);
	return {
		...ds,
		columns: keepIdx.map((i) => ds.columns[i]),
		rows: ds.rows.map((r) => keepIdx.map((i) => r[i]))
	};
}

export function keepColumns(ds: ServerDataset, cols: string[]): ServerDataset {
	const keep = new Set(cols);
	const keepIdx = ds.columns.map((c, i) => (keep.has(c) ? i : -1)).filter((i) => i >= 0);
	return {
		...ds,
		columns: keepIdx.map((i) => ds.columns[i]),
		rows: ds.rows.map((r) => keepIdx.map((i) => r[i]))
	};
}

export function dropMissing(ds: ServerDataset, cols?: string[]): ServerDataset {
	const target = cols && cols.length ? cols : ds.columns;
	const idxs = target.map((c) => ds.columns.indexOf(c)).filter((i) => i >= 0);
	return { ...ds, rows: ds.rows.filter((r) => idxs.every((i) => r[i] !== null)) };
}

export function dropDuplicates(ds: ServerDataset, cols?: string[]): ServerDataset {
	const target = cols && cols.length ? cols : ds.columns;
	const idxs = target.map((c) => ds.columns.indexOf(c)).filter((i) => i >= 0);
	const seen = new Set<string>();
	const rows: Cell[][] = [];
	for (const r of ds.rows) {
		const key = JSON.stringify(idxs.map((i) => r[i]));
		if (seen.has(key)) continue;
		seen.add(key);
		rows.push(r);
	}
	return { ...ds, rows };
}

export function renameColumn(ds: ServerDataset, from: string, to: string): ServerDataset {
	const idx = ds.columns.indexOf(from);
	if (idx < 0) return ds;
	const columns = [...ds.columns];
	columns[idx] = to;
	return { ...ds, columns };
}

function numericValues(ds: ServerDataset, col: string): number[] {
	const idx = ds.columns.indexOf(col);
	if (idx < 0) return [];
	const out: number[] = [];
	for (const r of ds.rows) {
		const v = r[idx];
		if (v === null) continue;
		const n = Number(v);
		if (!Number.isNaN(n)) out.push(n);
	}
	return out;
}

export function mean(ds: ServerDataset, col: string): number {
	const v = numericValues(ds, col);
	return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
}

export function median(ds: ServerDataset, col: string): number {
	const v = [...numericValues(ds, col)].sort((a, b) => a - b);
	if (!v.length) return NaN;
	const mid = Math.floor(v.length / 2);
	return v.length % 2 === 0 ? (v[mid - 1] + v[mid]) / 2 : v[mid];
}

export function variance(ds: ServerDataset, col: string): number {
	const v = numericValues(ds, col);
	if (!v.length) return NaN;
	const m = v.reduce((a, b) => a + b, 0) / v.length;
	return v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length;
}

export function stdev(ds: ServerDataset, col: string): number {
	const vv = variance(ds, col);
	return Number.isNaN(vv) ? NaN : Math.sqrt(vv);
}

export function min(ds: ServerDataset, col: string): number {
	const v = numericValues(ds, col);
	if (!v.length) return NaN;
	let m = v[0];
	for (let i = 1; i < v.length; i++) if (v[i] < m) m = v[i];
	return m;
}

export function max(ds: ServerDataset, col: string): number {
	const v = numericValues(ds, col);
	if (!v.length) return NaN;
	let m = v[0];
	for (let i = 1; i < v.length; i++) if (v[i] > m) m = v[i];
	return m;
}

export function sum(ds: ServerDataset, col: string): number {
	return numericValues(ds, col).reduce((a, b) => a + b, 0);
}

export function count(ds: ServerDataset, col: string, value?: string): number {
	const idx = ds.columns.indexOf(col);
	if (idx < 0) return 0;
	if (value !== undefined && value !== '') {
		return ds.rows.filter((r) => r[idx] === value).length;
	}
	return ds.rows.filter((r) => r[idx] !== null).length;
}

export function unique(ds: ServerDataset, col: string): string[] {
	const idx = ds.columns.indexOf(col);
	if (idx < 0) return [];
	const set = new Set<string>();
	for (const r of ds.rows) {
		const v = r[idx];
		if (v !== null) set.add(v);
	}
	return [...set];
}

export function frequency(ds: ServerDataset, col: string): Array<[string, number]> {
	const idx = ds.columns.indexOf(col);
	if (idx < 0) return [];
	const freq = new Map<string, number>();
	for (const r of ds.rows) {
		const v = r[idx];
		if (v === null) continue;
		freq.set(v, (freq.get(v) ?? 0) + 1);
	}
	return [...freq.entries()].sort((a, b) => b[1] - a[1]);
}

export function isNumeric(ds: ServerDataset, col: string): boolean {
	const idx = ds.columns.indexOf(col);
	if (idx < 0) return false;
	let total = 0;
	let num = 0;
	for (const r of ds.rows) {
		const v = r[idx];
		if (v === null) continue;
		total++;
		if (!Number.isNaN(Number(v))) num++;
	}
	return total > 0 && num / total >= 0.8;
}

function fmt(n: number): string {
	if (!Number.isFinite(n)) return '—';
	if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
	return n.toFixed(4);
}

export function describe(ds: ServerDataset, col?: string): { columns: string[]; rows: Cell[][] } {
	const targets = col ? [col] : ds.columns;
	const outCols = [
		'column',
		'kind',
		'count',
		'missing',
		'unique',
		'mean',
		'median',
		'stdev',
		'min',
		'max'
	];
	const rows: Cell[][] = [];
	for (const c of targets) {
		const idx = ds.columns.indexOf(c);
		if (idx < 0) continue;
		const nonNull = ds.rows.filter((r) => r[idx] !== null);
		const missing = ds.rows.length - nonNull.length;
		const uniq = new Set(nonNull.map((r) => r[idx])).size;
		if (isNumeric(ds, c)) {
			rows.push([
				c,
				'numeric',
				String(nonNull.length),
				String(missing),
				String(uniq),
				fmt(mean(ds, c)),
				fmt(median(ds, c)),
				fmt(stdev(ds, c)),
				fmt(min(ds, c)),
				fmt(max(ds, c))
			]);
		} else {
			rows.push([
				c,
				'text',
				String(nonNull.length),
				String(missing),
				String(uniq),
				null,
				null,
				null,
				null,
				null
			]);
		}
	}
	return { columns: outCols, rows };
}
