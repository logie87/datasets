import type { DatasetPreview, OpName, OpResult } from '$lib/types';

async function errText(res: Response): Promise<string> {
	try {
		const j = await res.json();
		return j.error ?? res.statusText;
	} catch {
		return res.statusText;
	}
}

export async function uploadDataset(file: File): Promise<DatasetPreview> {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch('/api/datasets', { method: 'POST', body: form });
	if (!res.ok) throw new Error(await errText(res));
	return res.json();
}

export async function uploadFromUrl(url: string, name: string): Promise<DatasetPreview> {
	const r = await fetch(url);
	if (!r.ok) throw new Error(`could not fetch ${url}`);
	const blob = await r.blob();
	return uploadDataset(new File([blob], name, { type: 'text/csv' }));
}

export async function runOp(
	id: string,
	op: OpName,
	params: Record<string, unknown>
): Promise<OpResult> {
	const res = await fetch(`/api/datasets/${id}/ops`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ op, params })
	});
	return res.json();
}

export async function deleteDataset(id: string): Promise<void> {
	await fetch(`/api/datasets/${id}`, { method: 'DELETE' });
}
