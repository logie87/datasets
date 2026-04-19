import type { OpName } from './types';

export type ParamKind = 'column' | 'columns' | 'string' | 'number';

export type OpParam = {
	name: string;
	kind: ParamKind;
	required?: boolean;
	default?: string | number;
	description?: string;
};

export type OpCategory = 'aggregate' | 'describe' | 'mutate';

export type OpDef = {
	name: OpName;
	category: OpCategory;
	description: string;
	signature: string;
	params: OpParam[];
};

export const OPS: OpDef[] = [
	{
		name: 'mean',
		category: 'aggregate',
		description: 'Arithmetic mean of a numeric column',
		signature: 'mean(column)',
		params: [{ name: 'column', kind: 'column', required: true }]
	},
	{
		name: 'median',
		category: 'aggregate',
		description: 'Median of a numeric column',
		signature: 'median(column)',
		params: [{ name: 'column', kind: 'column', required: true }]
	},
	{
		name: 'stdev',
		category: 'aggregate',
		description: 'Population standard deviation',
		signature: 'stdev(column)',
		params: [{ name: 'column', kind: 'column', required: true }]
	},
	{
		name: 'variance',
		category: 'aggregate',
		description: 'Population variance',
		signature: 'variance(column)',
		params: [{ name: 'column', kind: 'column', required: true }]
	},
	{
		name: 'min',
		category: 'aggregate',
		description: 'Minimum value of a numeric column',
		signature: 'min(column)',
		params: [{ name: 'column', kind: 'column', required: true }]
	},
	{
		name: 'max',
		category: 'aggregate',
		description: 'Maximum value of a numeric column',
		signature: 'max(column)',
		params: [{ name: 'column', kind: 'column', required: true }]
	},
	{
		name: 'sum',
		category: 'aggregate',
		description: 'Sum of a numeric column',
		signature: 'sum(column)',
		params: [{ name: 'column', kind: 'column', required: true }]
	},
	{
		name: 'count',
		category: 'aggregate',
		description: 'Count of non-null values, or of rows equal to a given value',
		signature: 'count(column, value?)',
		params: [
			{ name: 'column', kind: 'column', required: true },
			{ name: 'value', kind: 'string', required: false, description: 'optional exact-match' }
		]
	},
	{
		name: 'describe',
		category: 'describe',
		description: 'Per-column summary stats (count, missing, mean/median/stdev/min/max)',
		signature: 'describe(column?)',
		params: [{ name: 'column', kind: 'column', required: false }]
	},
	{
		name: 'unique',
		category: 'describe',
		description: 'Unique non-null values of a column',
		signature: 'unique(column)',
		params: [{ name: 'column', kind: 'column', required: true }]
	},
	{
		name: 'frequency',
		category: 'describe',
		description: 'Value counts, descending by frequency',
		signature: 'frequency(column)',
		params: [{ name: 'column', kind: 'column', required: true }]
	},
	{
		name: 'drop_columns',
		category: 'mutate',
		description: 'Remove the listed columns from the dataset',
		signature: 'drop_columns(columns)',
		params: [{ name: 'columns', kind: 'columns', required: true }]
	},
	{
		name: 'keep_columns',
		category: 'mutate',
		description: 'Keep only the listed columns',
		signature: 'keep_columns(columns)',
		params: [{ name: 'columns', kind: 'columns', required: true }]
	},
	{
		name: 'drop_missing',
		category: 'mutate',
		description: 'Drop rows with missing values; if columns given, only check those',
		signature: 'drop_missing(columns?)',
		params: [{ name: 'columns', kind: 'columns', required: false }]
	},
	{
		name: 'drop_duplicates',
		category: 'mutate',
		description: 'Drop duplicate rows; if columns given, dedupe by those only',
		signature: 'drop_duplicates(columns?)',
		params: [{ name: 'columns', kind: 'columns', required: false }]
	},
	{
		name: 'rename_column',
		category: 'mutate',
		description: 'Rename a column',
		signature: 'rename_column(from, to)',
		params: [
			{ name: 'from', kind: 'column', required: true },
			{ name: 'to', kind: 'string', required: true }
		]
	}
];

export function findOp(name: OpName): OpDef | undefined {
	return OPS.find((o) => o.name === name);
}
