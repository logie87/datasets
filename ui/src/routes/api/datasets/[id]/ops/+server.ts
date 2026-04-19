import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { get, put } from '$lib/server/store';
import * as ops from '$lib/server/ops';
import type { OpRequest, OpResult } from '$lib/types';

// TEMPORARY BACKEND STUB — replace with proxy to .NET.

function datasetPayload(ds: ReturnType<typeof get>) {
	if (!ds) return null;
	return {
		id: ds.id,
		name: ds.name,
		columns: ds.columns,
		rows: ds.rows,
		row_count: ds.rows.length
	};
}

export const POST: RequestHandler = async ({ params, request }) => {
	const ds = get(params.id);
	if (!ds) throw error(404, 'dataset not found');
	const body = (await request.json()) as OpRequest;
	const p = body.params ?? {};
	const col = typeof p.column === 'string' ? p.column : undefined;
	const colsParam = Array.isArray(p.columns) ? (p.columns as string[]) : undefined;

	const scalar = (value: number | string | null, label: string): OpResult => ({
		kind: 'scalar',
		value,
		label
	});
	const tableOut = (
		table: { columns: string[]; rows: (string | null)[][] },
		label: string
	): OpResult => ({ kind: 'table', table, label });

	try {
		switch (body.op) {
			case 'mean':
				if (!col) throw new Error('column required');
				return json(scalar(ops.mean(ds, col), `mean(column=${JSON.stringify(col)})`));
			case 'median':
				if (!col) throw new Error('column required');
				return json(scalar(ops.median(ds, col), `median(column=${JSON.stringify(col)})`));
			case 'stdev':
				if (!col) throw new Error('column required');
				return json(scalar(ops.stdev(ds, col), `stdev(column=${JSON.stringify(col)})`));
			case 'variance':
				if (!col) throw new Error('column required');
				return json(scalar(ops.variance(ds, col), `variance(column=${JSON.stringify(col)})`));
			case 'min':
				if (!col) throw new Error('column required');
				return json(scalar(ops.min(ds, col), `min(column=${JSON.stringify(col)})`));
			case 'max':
				if (!col) throw new Error('column required');
				return json(scalar(ops.max(ds, col), `max(column=${JSON.stringify(col)})`));
			case 'sum':
				if (!col) throw new Error('column required');
				return json(scalar(ops.sum(ds, col), `sum(column=${JSON.stringify(col)})`));
			case 'count': {
				if (!col) throw new Error('column required');
				const val = typeof p.value === 'string' && p.value !== '' ? p.value : undefined;
				const label = val
					? `count(column=${JSON.stringify(col)}, value=${JSON.stringify(val)})`
					: `count(column=${JSON.stringify(col)})`;
				return json(scalar(ops.count(ds, col, val), label));
			}
			case 'unique': {
				if (!col) throw new Error('column required');
				const vals = ops.unique(ds, col);
				return json(
					tableOut(
						{ columns: ['value'], rows: vals.map((v) => [v]) },
						`unique(column=${JSON.stringify(col)})`
					)
				);
			}
			case 'frequency': {
				if (!col) throw new Error('column required');
				const f = ops.frequency(ds, col);
				return json(
					tableOut(
						{ columns: ['value', 'count'], rows: f.map(([v, n]) => [v, String(n)]) },
						`frequency(column=${JSON.stringify(col)})`
					)
				);
			}
			case 'describe': {
				const table = ops.describe(ds, col);
				const label = col ? `describe(column=${JSON.stringify(col)})` : 'describe()';
				return json(tableOut(table, label));
			}
			case 'drop_columns': {
				if (!colsParam || !colsParam.length) throw new Error('columns required');
				const next = ops.dropColumns(ds, colsParam);
				put(next);
				return json({
					kind: 'dataset',
					dataset: datasetPayload(next)!,
					label: `drop_columns(columns=${JSON.stringify(colsParam)})`
				} satisfies OpResult);
			}
			case 'keep_columns': {
				if (!colsParam || !colsParam.length) throw new Error('columns required');
				const next = ops.keepColumns(ds, colsParam);
				put(next);
				return json({
					kind: 'dataset',
					dataset: datasetPayload(next)!,
					label: `keep_columns(columns=${JSON.stringify(colsParam)})`
				} satisfies OpResult);
			}
			case 'drop_missing': {
				const next = ops.dropMissing(ds, colsParam);
				put(next);
				const label = colsParam?.length
					? `drop_missing(columns=${JSON.stringify(colsParam)})`
					: 'drop_missing()';
				return json({
					kind: 'dataset',
					dataset: datasetPayload(next)!,
					label
				} satisfies OpResult);
			}
			case 'drop_duplicates': {
				const next = ops.dropDuplicates(ds, colsParam);
				put(next);
				const label = colsParam?.length
					? `drop_duplicates(columns=${JSON.stringify(colsParam)})`
					: 'drop_duplicates()';
				return json({
					kind: 'dataset',
					dataset: datasetPayload(next)!,
					label
				} satisfies OpResult);
			}
			case 'rename_column': {
				const from = typeof p.from === 'string' ? p.from : '';
				const to = typeof p.to === 'string' ? p.to : '';
				if (!from || !to) throw new Error('from and to required');
				const next = ops.renameColumn(ds, from, to);
				put(next);
				return json({
					kind: 'dataset',
					dataset: datasetPayload(next)!,
					label: `rename_column(from=${JSON.stringify(from)}, to=${JSON.stringify(to)})`
				} satisfies OpResult);
			}
			default:
				return json(
					{
						kind: 'error',
						error: `unknown op: ${body.op}`,
						label: `${body.op}(...)`
					} satisfies OpResult,
					{ status: 400 }
				);
		}
	} catch (e) {
		return json(
			{
				kind: 'error',
				error: e instanceof Error ? e.message : 'server error',
				label: `${body.op}(...)`
			} satisfies OpResult,
			{ status: 400 }
		);
	}
};
