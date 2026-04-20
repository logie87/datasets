<script lang="ts">
	import { deleteDataset, runOp, uploadDataset } from '$lib/client/api';
	import { OPS, type OpDef } from '$lib/ops-catalog';
	import type { Cell, DatasetPreview, OpLogEntry, OpResult } from '$lib/types';

	let dataset = $state<DatasetPreview | null>(null);
	let originalFile = $state<File | null>(null);
	let loading = $state(false);
	let errorMsg = $state('');

	let opSearch = $state('');
	let selectedOp = $state<OpDef | null>(null);
	let params = $state<Record<string, string | string[]>>({});
	let log = $state<OpLogEntry[]>([]);

	let filterCol = $state<string>('');
	let filterValue = $state('');
	let sortCol = $state<string | null>(null);
	let sortDir = $state<'asc' | 'desc'>('asc');
	let rowsPerPage = $state(25);
	let page = $state(0);

	const filteredOps = $derived(
		opSearch.trim()
			? OPS.filter(
					(o) =>
						o.name.includes(opSearch.toLowerCase()) ||
						o.description.toLowerCase().includes(opSearch.toLowerCase())
				)
			: OPS
	);

	const groupedOps = $derived.by(() => {
		const groups: Record<OpDef['category'], OpDef[]> = {
			aggregate: [],
			describe: [],
			mutate: []
		};
		for (const o of filteredOps) groups[o.category].push(o);
		return groups;
	});

	const visibleRows = $derived.by(() => {
		if (!dataset) return [] as Cell[][];
		let rows = dataset.rows;
		if (filterCol && filterValue !== '') {
			const idx = dataset.columns.indexOf(filterCol);
			if (idx >= 0) {
				const q = filterValue.toLowerCase();
				rows = rows.filter((r) => String(r[idx] ?? '').toLowerCase().includes(q));
			}
		}
		if (sortCol) {
			const idx = dataset.columns.indexOf(sortCol);
			if (idx >= 0) {
				const dir = sortDir === 'asc' ? 1 : -1;
				rows = [...rows].sort((a, b) => {
					const av = a[idx];
					const bv = b[idx];
					if (av === null && bv === null) return 0;
					if (av === null) return 1;
					if (bv === null) return -1;
					const an = Number(av);
					const bn = Number(bv);
					if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * dir;
					return String(av).localeCompare(String(bv)) * dir;
				});
			}
		}
		return rows;
	});

	const pageCount = $derived(Math.max(1, Math.ceil(visibleRows.length / rowsPerPage)));
	const pagedRows = $derived(
		visibleRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
	);

	async function onFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		await loadFile(file);
	}

	async function loadFile(file: File) {
		loading = true;
		errorMsg = '';
		try {
			const ds = await uploadDataset(file);
			dataset = ds;
			originalFile = file;
			selectedOp = null;
			params = {};
			log = [];
			page = 0;
			filterCol = '';
			filterValue = '';
			sortCol = null;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'upload failed';
		} finally {
			loading = false;
		}
	}

	async function loadSample() {
		loading = true;
		errorMsg = '';
		try {
			const r = await fetch('/samples/coffee_orders.csv');
			if (!r.ok) throw new Error(`sample fetch failed (${r.status})`);
			const blob = await r.blob();
			const file = new File([blob], 'coffee_orders.csv', { type: 'text/csv' });
			await loadFile(file);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'sample load failed';
		} finally {
			loading = false;
		}
	}

	function selectOp(op: OpDef) {
		selectedOp = op;
		const next: Record<string, string | string[]> = {};
		for (const p of op.params) {
			if (p.kind === 'columns') next[p.name] = [];
			else if (p.kind === 'column') next[p.name] = dataset?.columns[0] ?? '';
			else next[p.name] = p.default !== undefined ? String(p.default) : '';
		}
		params = next;
	}

	function toggleColumnParam(name: string, col: string) {
		const list = Array.isArray(params[name]) ? [...(params[name] as string[])] : [];
		const idx = list.indexOf(col);
		if (idx >= 0) list.splice(idx, 1);
		else list.push(col);
		params = { ...params, [name]: list };
	}

	function buildCleanedParams(op: OpDef): Record<string, unknown> {
		const cleaned: Record<string, unknown> = {};
		for (const p of op.params) {
			const v = params[p.name];
			if (p.kind === 'columns') {
				if (Array.isArray(v) && v.length) cleaned[p.name] = v;
			} else if (p.kind === 'number') {
				if (typeof v === 'string' && v !== '') cleaned[p.name] = Number(v);
			} else {
				if (typeof v === 'string' && v !== '') cleaned[p.name] = v;
			}
		}
		return cleaned;
	}

	async function runSelected() {
		if (!dataset || !selectedOp) return;
		const op = selectedOp;
		const cleaned = buildCleanedParams(op);
		const entry: OpLogEntry = {
			ts: Date.now(),
			call: `${op.name}(...)`,
			result: { kind: 'pending', label: `${op.name}(...)` }
		};
		log = [entry, ...log];
		try {
			const result: OpResult = await runOp(dataset.id, op.name, cleaned);
			entry.call = result.label;
			entry.result = result;
			if (result.kind === 'dataset') {
				dataset = result.dataset;
			}
			log = [...log];
		} catch (err) {
			entry.result = {
				kind: 'error',
				error: err instanceof Error ? err.message : 'error',
				label: entry.call
			};
			log = [...log];
		}
	}

	function sortBy(col: string) {
		if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortCol = col;
			sortDir = 'asc';
		}
	}

	function clearSort() {
		sortCol = null;
	}

	async function resetDataset() {
		if (!originalFile) return;
		await loadFile(originalFile);
	}

	async function closeDataset() {
		if (dataset) await deleteDataset(dataset.id);
		dataset = null;
		originalFile = null;
		selectedOp = null;
		log = [];
	}

	function formatValue(v: number | string | null): string {
		if (v === null) return '—';
		if (typeof v === 'number') {
			if (!Number.isFinite(v)) return '—';
			if (Number.isInteger(v) && Math.abs(v) < 1e12) return String(v);
			return v.toFixed(4);
		}
		return v;
	}

	function formatTs(ts: number): string {
		const d = new Date(ts);
		return d.toLocaleTimeString(undefined, { hour12: false });
	}
</script>

{#if !dataset}
	<section class="mx-auto max-w-xl">
		<h1 class="font-mono text-base text-slate-700 dark:text-zinc-300">load a dataset</h1>
		<p class="mt-1 font-mono text-xs text-slate-500 dark:text-zinc-500">
			csv only. <span
				class="text-slate-700 dark:text-zinc-300">/api/datasets</span
			>.
		</p>
		<div
			class="mt-4 flex flex-col gap-3 rounded border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<input
				type="file"
				accept=".csv,text/csv"
				onchange={onFileChange}
				disabled={loading}
				class="block text-xs text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:font-mono file:text-xs file:text-white hover:file:bg-slate-600 disabled:opacity-50 dark:text-zinc-400 dark:file:bg-zinc-700 dark:hover:file:bg-zinc-600"
			/>
			<button
				type="button"
				onclick={loadSample}
				disabled={loading}
				class="self-start rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
			>
				load sample: coffee_orders.csv
			</button>
			{#if loading}
				<span class="font-mono text-xs text-slate-500 dark:text-zinc-500">loading…</span>
			{/if}
			{#if errorMsg}
				<span class="font-mono text-xs text-rose-500">error: {errorMsg}</span>
			{/if}
		</div>
	</section>
{:else}
	<div
		class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-white px-4 py-2 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900"
	>
		<div class="flex items-center gap-4">
			<span class="text-slate-500 dark:text-zinc-500">dataset</span>
			<span class="text-slate-800 dark:text-zinc-300">{dataset.name}</span>
			<span class="text-slate-500 dark:text-zinc-500">
				{dataset.row_count} × {dataset.columns.length}
			</span>
			<span class="text-slate-400 dark:text-zinc-600">id: {dataset.id.slice(0, 8)}</span>
		</div>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={resetDataset}
				class="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
			>
				reset
			</button>
			<button
				type="button"
				onclick={closeDataset}
				class="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
			>
				close
			</button>
		</div>
	</div>

	<div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
		<section
			class="rounded border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
		>
			<div
				class="flex flex-wrap items-center gap-3 border-b border-slate-200 px-3 py-2 dark:border-zinc-800"
			>
				<span class="font-mono text-[11px] text-slate-500 dark:text-zinc-500">filter</span>
				<select
					bind:value={filterCol}
					class="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
				>
					<option value="">(column)</option>
					{#each dataset.columns as c (c)}
						<option value={c}>{c}</option>
					{/each}
				</select>
				<input
					type="text"
					bind:value={filterValue}
					placeholder="contains…"
					class="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
				/>
				{#if sortCol}
					<span class="font-mono text-[11px] text-slate-500 dark:text-zinc-500">
						sort: {sortCol} {sortDir}
					</span>
					<button
						type="button"
						onclick={clearSort}
						class="rounded border border-slate-300 px-1 py-0.5 font-mono text-[11px] text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
					>
						clear
					</button>
				{/if}
				<span class="ml-auto font-mono text-[11px] text-slate-500 dark:text-zinc-500">
					{visibleRows.length} / {dataset.row_count} rows
				</span>
			</div>

			<div class="max-h-[480px] overflow-auto font-mono text-xs">
				<table class="min-w-full border-collapse">
					<thead class="sticky top-0 z-10 bg-slate-50 dark:bg-zinc-900/95">
						<tr>
							<th
								class="border-b border-slate-200 px-2 py-1.5 text-right text-[10px] font-normal text-slate-400 dark:border-zinc-800 dark:text-zinc-600"
							>
								#
							</th>
							{#each dataset.columns as col (col)}
								<th
									class="border-b border-slate-200 px-2 py-1.5 text-left dark:border-zinc-800"
								>
									<button
										type="button"
										onclick={() => sortBy(col)}
										class="text-slate-700 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400"
									>
										{col}{sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
									</button>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each pagedRows as row, rIdx (rIdx)}
							<tr class="hover:bg-slate-50 dark:hover:bg-zinc-900/50">
								<td
									class="border-b border-slate-100 px-2 py-1 text-right text-[10px] text-slate-400 dark:border-zinc-800 dark:text-zinc-600"
								>
									{page * rowsPerPage + rIdx + 1}
								</td>
								{#each row as cell, cIdx (cIdx)}
									<td
										class="border-b border-slate-100 px-2 py-1 whitespace-nowrap text-slate-800 dark:border-zinc-800 dark:text-zinc-300"
									>
										{#if cell === null}
											<span class="text-rose-400 italic">NA</span>
										{:else}
											{cell}
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div
				class="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[11px] text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
			>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => (page = Math.max(0, page - 1))}
						disabled={page === 0}
						class="rounded border border-slate-300 px-1.5 py-0.5 hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
					>
						prev
					</button>
					<span>page {page + 1}/{pageCount}</span>
					<button
						type="button"
						onclick={() => (page = Math.min(pageCount - 1, page + 1))}
						disabled={page >= pageCount - 1}
						class="rounded border border-slate-300 px-1.5 py-0.5 hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
					>
						next
					</button>
				</div>
				<label for="rows-per-page" class="flex items-center gap-1">
					rows/page
					<select
						id="rows-per-page"
						bind:value={rowsPerPage}
						class="rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-zinc-700 dark:bg-zinc-900"
					>
						<option value={10}>10</option>
						<option value={25}>25</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</label>
			</div>
		</section>

		<aside
			class="rounded border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
		>
			<div class="border-b border-slate-200 px-3 py-2 dark:border-zinc-800">
				<span class="font-mono text-[11px] text-slate-500 dark:text-zinc-500">operations</span>
				<input
					type="text"
					bind:value={opSearch}
					placeholder="search…"
					class="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
				/>
			</div>

			<div class="max-h-[260px] overflow-auto px-3 py-2 font-mono text-xs">
				{#each ['aggregate', 'describe', 'mutate'] as const as cat (cat)}
					{#if groupedOps[cat].length}
						<div class="mt-2 first:mt-0">
							<p class="text-[10px] tracking-wide text-slate-400 uppercase dark:text-zinc-600">
								{cat}
							</p>
							<ul class="mt-1 space-y-0.5">
								{#each groupedOps[cat] as op (op.name)}
									<li>
										<button
											type="button"
											onclick={() => selectOp(op)}
											class="w-full rounded px-1.5 py-0.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800"
											class:bg-slate-100={selectedOp?.name === op.name}
											class:text-sky-700={selectedOp?.name === op.name}
											class:dark:bg-zinc-800={selectedOp?.name === op.name}
											class:dark:text-sky-400={selectedOp?.name === op.name}
										>
											<span class="text-slate-800 dark:text-zinc-300">{op.signature}</span>
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/each}
			</div>

			<div class="border-t border-slate-200 px-3 py-3 dark:border-zinc-800">
				{#if selectedOp}
					<div class="font-mono text-xs">
						<p class="text-slate-700 dark:text-zinc-300">{selectedOp.signature}</p>
						<p class="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-500">
							{selectedOp.description}
						</p>
					</div>
					<div class="mt-3 space-y-2 font-mono text-xs">
						{#each selectedOp.params as p (p.name)}
							{@const fieldId = `param-${p.name}`}
							<div>
								<label
									for={fieldId}
									class="block text-[11px] text-slate-500 dark:text-zinc-500"
								>
									{p.name}{p.required ? ' *' : ''}
									{#if p.description}<span class="ml-1 text-slate-400 dark:text-zinc-600"
											>· {p.description}</span
										>{/if}
								</label>
								{#if p.kind === 'column'}
									<select
										id={fieldId}
										value={(params[p.name] as string) ?? ''}
										onchange={(e) =>
											(params = {
												...params,
												[p.name]: (e.target as HTMLSelectElement).value
											})}
										class="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
									>
										{#if !p.required}
											<option value="">(none)</option>
										{/if}
										{#each dataset.columns as c (c)}
											<option value={c}>{c}</option>
										{/each}
									</select>
								{:else if p.kind === 'columns'}
									<div
										id={fieldId}
										class="mt-0.5 max-h-32 overflow-auto rounded border border-slate-300 px-1.5 py-1 dark:border-zinc-700"
									>
										{#each dataset.columns as c (c)}
											<label class="flex items-center gap-1.5 py-0.5">
												<input
													type="checkbox"
													checked={Array.isArray(params[p.name]) &&
														(params[p.name] as string[]).includes(c)}
													onchange={() => toggleColumnParam(p.name, c)}
												/>
												<span class="text-slate-700 dark:text-zinc-300">{c}</span>
											</label>
										{/each}
									</div>
								{:else if p.kind === 'number'}
									<input
										id={fieldId}
										type="number"
										value={(params[p.name] as string) ?? ''}
										oninput={(e) =>
											(params = {
												...params,
												[p.name]: (e.target as HTMLInputElement).value
											})}
										class="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
									/>
								{:else}
									<input
										id={fieldId}
										type="text"
										value={(params[p.name] as string) ?? ''}
										oninput={(e) =>
											(params = {
												...params,
												[p.name]: (e.target as HTMLInputElement).value
											})}
										class="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
									/>
								{/if}
							</div>
						{/each}
						<button
							type="button"
							onclick={runSelected}
							class="mt-2 w-full rounded border border-slate-400 bg-slate-700 px-2 py-1 font-mono text-xs text-white hover:bg-slate-600 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
						>
							run {selectedOp.name}
						</button>
					</div>
				{:else}
					<p class="font-mono text-[11px] text-slate-500 dark:text-zinc-500">
						select an operation to see its parameters.
					</p>
				{/if}
			</div>
		</aside>
	</div>

	<section
		class="mt-4 rounded border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
	>
		<div
			class="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-zinc-800"
		>
			<span class="font-mono text-[11px] text-slate-500 dark:text-zinc-500">console</span>
			{#if log.length}
				<button
					type="button"
					onclick={() => (log = [])}
					class="font-mono text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300"
				>
					clear
				</button>
			{/if}
		</div>
		<div class="max-h-[360px] overflow-auto px-3 py-2 font-mono text-xs">
			{#if log.length === 0}
				<p class="text-slate-400 dark:text-zinc-600">no ops run yet.</p>
			{:else}
				<ul class="space-y-3">
					{#each log as entry (entry.ts)}
						<li class="border-l-2 border-slate-200 pl-2 dark:border-zinc-800">
							<div class="flex items-center gap-2">
								<span class="text-[10px] text-slate-400 dark:text-zinc-600">
									{formatTs(entry.ts)}
								</span>
								<span class="text-slate-700 dark:text-zinc-300">&gt; {entry.result.label}</span>
							</div>
							<div class="mt-1 pl-4">
								{#if entry.result.kind === 'pending'}
									<span class="text-slate-400 dark:text-zinc-600">running…</span>
								{:else if entry.result.kind === 'scalar'}
									<span class="text-emerald-600 dark:text-emerald-500">
										{formatValue(entry.result.value)}
									</span>
								{:else if entry.result.kind === 'table'}
									<div class="overflow-auto">
										<table class="border-collapse">
											<thead>
												<tr>
													{#each entry.result.table.columns as c (c)}
														<th
															class="border border-slate-200 bg-slate-50 px-2 py-0.5 text-left text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
														>
															{c}
														</th>
													{/each}
												</tr>
											</thead>
											<tbody>
												{#each entry.result.table.rows as r, i (i)}
													<tr>
														{#each r as cell, j (j)}
															<td
																class="border border-slate-200 px-2 py-0.5 text-slate-800 dark:border-zinc-800 dark:text-zinc-300"
															>
																{cell ?? '—'}
															</td>
														{/each}
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								{:else if entry.result.kind === 'dataset'}
									<span class="text-sky-600 dark:text-sky-400">
										dataset updated: {entry.result.dataset.row_count} × {entry.result.dataset
											.columns.length}
									</span>
								{:else if entry.result.kind === 'error'}
									<span class="text-rose-500">error: {entry.result.error}</span>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>
{/if}
