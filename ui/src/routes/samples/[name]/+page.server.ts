import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SAMPLES_DIR = 'static/samples';

function safeName(n: string): boolean {
	return /^[a-zA-Z0-9_.-]+\.csv$/.test(n) && !n.includes('..');
}

export const load: PageServerLoad = async ({ params }) => {
	if (!safeName(params.name)) throw error(400, 'invalid filename');
	try {
		const text = await readFile(join(SAMPLES_DIR, params.name), 'utf-8');
		return { name: params.name, text };
	} catch {
		throw error(404, 'sample not found');
	}
};
