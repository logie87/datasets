import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { parseCsv } from '$lib/csv';
import { put } from '$lib/server/store';

// TEMPORARY BACKEND STUB — emulates what the .NET API will expose.
// Replace with a proxy (or remove entirely) once the ASP.NET service is running.

export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) {
		return json({ error: 'missing file' }, { status: 400 });
	}
	const text = await file.text();
	const { columns, rows } = parseCsv(text);
	if (columns.length === 0) {
		return json({ error: 'empty or malformed CSV' }, { status: 400 });
	}
	const id = randomUUID();
	put({ id, name: file.name, columns, rows });
	return json({ id, name: file.name, columns, rows, row_count: rows.length });
};
