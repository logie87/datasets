export type Cell = string | null;

export type DatasetPreview = {
	id: string;
	name: string;
	columns: string[];
	rows: Cell[][];
	row_count: number;
};

export type OpName =
	| 'drop_columns'
	| 'keep_columns'
	| 'drop_missing'
	| 'drop_duplicates'
	| 'rename_column'
	| 'mean'
	| 'median'
	| 'stdev'
	| 'variance'
	| 'min'
	| 'max'
	| 'sum'
	| 'count'
	| 'describe'
	| 'unique'
	| 'frequency';

export type OpRequest = {
	op: OpName;
	params: Record<string, unknown>;
};

export type TableResult = {
	columns: string[];
	rows: Cell[][];
};

export type ScalarResult = { kind: 'scalar'; value: number | string | null; label: string };
export type TableResultWrap = { kind: 'table'; table: TableResult; label: string };
export type DatasetResult = { kind: 'dataset'; dataset: DatasetPreview; label: string };
export type ErrorResult = { kind: 'error'; error: string; label: string };

export type OpResult = ScalarResult | TableResultWrap | DatasetResult | ErrorResult;

export type OpLogEntry = {
	ts: number;
	call: string;
	result: OpResult | { kind: 'pending'; label: string };
};
