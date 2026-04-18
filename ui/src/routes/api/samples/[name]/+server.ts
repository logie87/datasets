import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { readFile, writeFile, unlink, access } from 'node:fs/promises';
import { join } from 'node:path';

const SAMPLES_DIR = 'static/samples';

function safeName(n: string): boolean {
	return /^[a-zA-Z0-9_.-]+\.csv$/.test(n) && !n.includes('..');
}

async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function nextCopyName(base: string): Promise<string> {
	const stem = base.replace(/\.csv$/i, '');
	let candidate = `${stem}_copy.csv`;
	let i = 2;
	while (await exists(join(SAMPLES_DIR, candidate))) {
		candidate = `${stem}_copy_${i}.csv`;
		i++;
	}
	return candidate;
}

export const PUT: RequestHandler = async ({ params, request }) => {
	if (!safeName(params.name)) throw error(400, 'invalid filename');
	const text = await request.text();
	if (text.length > 10 * 1024 * 1024) throw error(413, 'file too large');
	await writeFile(join(SAMPLES_DIR, params.name), text, 'utf-8');
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params }) => {
	if (!safeName(params.name)) throw error(400, 'invalid filename');
	try {
		await unlink(join(SAMPLES_DIR, params.name));
	} catch {
		throw error(404, 'sample not found');
	}
	return json({ ok: true });
};

export const POST: RequestHandler = async ({ params, request }) => {
	if (!safeName(params.name)) throw error(400, 'invalid filename');
	const body = await request.json().catch(() => ({}));
	if (body?.action !== 'duplicate') throw error(400, 'invalid action');
	let text: string;
	try {
		text = await readFile(join(SAMPLES_DIR, params.name), 'utf-8');
	} catch {
		throw error(404, 'sample not found');
	}
	const newName = await nextCopyName(params.name);
	await writeFile(join(SAMPLES_DIR, newName), text, 'utf-8');
	return json({ ok: true, name: newName });
};
