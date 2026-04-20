import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { get, remove } from '$lib/server/store';

// TEMPORARY BACKEND STUB — replace with proxy to .NET.

export const GET: RequestHandler = ({ params }) => {
	const ds = get(params.id);
	if (!ds) throw error(404, 'dataset not found');
	return json({
		id: ds.id,
		name: ds.name,
		columns: ds.columns,
		rows: ds.rows,
		row_count: ds.rows.length
	});
};

export const DELETE: RequestHandler = ({ params }) => {
	remove(params.id);
	return json({ ok: true });
};
