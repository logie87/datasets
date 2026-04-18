import type { PageServerLoad } from './$types';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const SAMPLES_DIR = 'static/samples';

type SampleEntry = { name: string; size: number; mtime: number };

export const load: PageServerLoad = async () => {
	let files: SampleEntry[] = [];
	try {
		const names = await readdir(SAMPLES_DIR);
		const entries: SampleEntry[] = [];
		for (const n of names) {
			if (!n.toLowerCase().endsWith('.csv')) continue;
			const s = await stat(join(SAMPLES_DIR, n));
			entries.push({ name: n, size: s.size, mtime: s.mtimeMs });
		}
		entries.sort((a, b) => a.name.localeCompare(b.name));
		files = entries;
	} catch {
		files = [];
	}
	return { files };
};
