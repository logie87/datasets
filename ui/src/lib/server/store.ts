import type { Cell } from '$lib/types';

export type ServerDataset = {
	id: string;
	name: string;
	columns: string[];
	rows: Cell[][];
};

type G = typeof globalThis & { __datasets?: Map<string, ServerDataset> };
const store: Map<string, ServerDataset> = ((globalThis as G).__datasets ??= new Map());

export function put(ds: ServerDataset): void {
	store.set(ds.id, ds);
}

export function get(id: string): ServerDataset | undefined {
	return store.get(id);
}

export function remove(id: string): boolean {
	return store.delete(id);
}
