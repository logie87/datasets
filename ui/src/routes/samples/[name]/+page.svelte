<script lang="ts">
	import type { PageData } from './$types';
	import { parseCsvRaw, toCsv } from '$lib/csv';
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	const initial = parseCsvRaw(data.text);
	let columns = $state<string[]>(initial.columns);
	let rows = $state<string[][]>(initial.rows);
	// svelte-ignore state_referenced_locally
	let originalText = $state(data.text);

	let editing = $state<{ row: number; col: number } | null>(null);
	let editValue = $state('');
	let editingHeader = $state<number | null>(null);
	let headerValue = $state('');

	let dirty = $state(false);
	let saving = $state(false);
	let message = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);

	function focusAction(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	async function startEdit(row: number, col: number) {
		if (editing) commitEdit();
		editValue = rows[row][col] ?? '';
		editing = { row, col };
		editingHeader = null;
		await tick();
	}

	function commitEdit() {
		if (!editing) return;
		const { row, col } = editing;
		if (rows[row][col] !== editValue) {
			rows[row][col] = editValue;
			dirty = true;
		}
		editing = null;
	}

	function cancelEdit() {
		editing = null;
	}

	function onEditKey(e: KeyboardEvent) {
		if (!editing) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const { row, col } = editing;
			commitEdit();
			if (!e.shiftKey && row + 1 < rows.length) startEdit(row + 1, col);
			else if (e.shiftKey && row > 0) startEdit(row - 1, col);
		} else if (e.key === 'Tab') {
			e.preventDefault();
			const { row, col } = editing;
			commitEdit();
			if (!e.shiftKey) {
				if (col + 1 < columns.length) startEdit(row, col + 1);
				else if (row + 1 < rows.length) startEdit(row + 1, 0);
			} else {
				if (col > 0) startEdit(row, col - 1);
				else if (row > 0) startEdit(row - 1, columns.length - 1);
			}
		}
	}

	async function startHeaderEdit(col: number) {
		if (editing) commitEdit();
		headerValue = columns[col];
		editingHeader = col;
		await tick();
	}

	function commitHeaderEdit() {
		if (editingHeader === null) return;
		const trimmed = headerValue.trim() || `col_${editingHeader + 1}`;
		if (columns[editingHeader] !== trimmed) {
			columns[editingHeader] = trimmed;
			dirty = true;
		}
		editingHeader = null;
	}

	function onHeaderKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			editingHeader = null;
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			e.preventDefault();
			commitHeaderEdit();
		}
	}

	function addRow() {
		rows.push(columns.map(() => ''));
		dirty = true;
	}

	function addColumn() {
		const name = `col_${columns.length + 1}`;
		columns.push(name);
		for (const r of rows) r.push('');
		dirty = true;
	}

	function deleteRow(index: number) {
		rows.splice(index, 1);
		dirty = true;
	}

	function deleteColumn(index: number) {
		columns.splice(index, 1);
		for (const r of rows) r.splice(index, 1);
		dirty = true;
	}

	async function save() {
		if (editing) commitEdit();
		if (editingHeader !== null) commitHeaderEdit();
		saving = true;
		message = null;
		try {
			const text = toCsv(columns, rows);
			const res = await fetch(`/api/samples/${encodeURIComponent(data.name)}`, {
				method: 'PUT',
				headers: { 'content-type': 'text/csv' },
				body: text
			});
			if (!res.ok) {
				const body = await res.text();
				throw new Error(body || res.statusText);
			}
			originalText = text;
			dirty = false;
			await goto('/samples', { invalidateAll: true });
		} catch (e) {
			message = { kind: 'err', text: e instanceof Error ? e.message : 'save failed' };
		} finally {
			saving = false;
		}
	}

	function revert() {
		const re = parseCsvRaw(originalText);
		columns = re.columns;
		rows = re.rows;
		dirty = false;
		editing = null;
		editingHeader = null;
	}

	function download() {
		const text = toCsv(columns, rows);
		const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = data.name;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>{data.name} — samples</title>
</svelte:head>

<div
	class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-white px-4 py-2 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900"
>
	<div class="flex items-center gap-3">
		<a
			href="/samples"
			class="text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-zinc-300"
		>
			← samples
		</a>
		<span class="text-slate-500 dark:text-zinc-500">file</span>
		<span class="text-slate-800 dark:text-zinc-300">{data.name}</span>
		<span class="text-slate-500 dark:text-zinc-500">
			{rows.length} × {columns.length}
		</span>
		{#if dirty}
			<span class="text-amber-600 dark:text-amber-500">● unsaved</span>
		{/if}
	</div>
	<div class="flex items-center gap-2">
		{#if message}
			<span
				class="font-mono text-[11px]"
				class:text-emerald-600={message.kind === 'ok'}
				class:dark:text-emerald-500={message.kind === 'ok'}
				class:text-rose-500={message.kind === 'err'}
			>
				{message.text}
			</span>
		{/if}
		<button
			type="button"
			onclick={revert}
			disabled={!dirty}
			class="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
		>
			revert
		</button>
		<button
			type="button"
			onclick={download}
			class="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
		>
			download
		</button>
		<button
			type="button"
			onclick={save}
			disabled={!dirty || saving}
			class="rounded border border-slate-400 bg-slate-700 px-2 py-1 text-white hover:bg-slate-600 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
		>
			{saving ? 'saving…' : 'save'}
		</button>
	</div>
</div>

<section
	class="mt-4 rounded border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
>
	<div
		class="flex items-center gap-3 border-b border-slate-200 px-3 py-2 font-mono text-[11px] text-slate-500 dark:border-zinc-800 dark:text-zinc-500"
	>
		<span>click a cell to edit · enter/tab advances · esc cancels</span>
		<span class="ml-auto">right-click column/row index to delete</span>
	</div>
	<div class="overflow-auto">
		<table class="min-w-full border-collapse font-mono text-xs">
			<thead class="bg-slate-50 dark:bg-zinc-900">
				<tr>
					<th
						class="sticky left-0 z-10 w-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-right text-[10px] font-normal text-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600"
					>
						#
					</th>
					{#each columns as col, cIdx (cIdx)}
						<th
							class="border-b border-r border-slate-200 px-2 py-1.5 text-left dark:border-zinc-800"
							oncontextmenu={(e) => {
								e.preventDefault();
								if (confirm(`delete column "${col}"?`)) deleteColumn(cIdx);
							}}
						>
							{#if editingHeader === cIdx}
								<input
									type="text"
									bind:value={headerValue}
									onblur={commitHeaderEdit}
									onkeydown={onHeaderKey}
									use:focusAction
									class="w-full border-0 bg-white px-1 py-0 font-mono text-xs text-slate-800 outline-sky-400 dark:bg-zinc-800 dark:text-zinc-200"
								/>
							{:else}
								<button
									type="button"
									onclick={() => startHeaderEdit(cIdx)}
									class="w-full text-left text-slate-700 hover:text-sky-700 dark:text-zinc-400 dark:hover:text-sky-400"
								>
									{col}
								</button>
							{/if}
						</th>
					{/each}
					<th
						class="border-b border-slate-200 px-2 py-1.5 dark:border-zinc-800"
						style="width: 1%"
					>
						<button
							type="button"
							onclick={addColumn}
							title="add column"
							class="rounded border border-slate-300 px-1.5 py-0 text-[11px] text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
						>
							+ col
						</button>
					</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row, rIdx (rIdx)}
					<tr>
						<td
							class="sticky left-0 z-10 border-b border-r border-slate-100 bg-slate-50 px-2 py-1 text-right text-[10px] text-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600"
							oncontextmenu={(e) => {
								e.preventDefault();
								if (confirm(`delete row ${rIdx + 1}?`)) deleteRow(rIdx);
							}}
						>
							{rIdx + 1}
						</td>
						{#each row as cell, cIdx (cIdx)}
							<td
								class="border-b border-r border-slate-100 p-0 dark:border-zinc-800"
								class:bg-sky-50={editing?.row === rIdx && editing?.col === cIdx}
								class:dark:bg-zinc-800={editing?.row === rIdx && editing?.col === cIdx}
							>
								{#if editing?.row === rIdx && editing?.col === cIdx}
									<input
										type="text"
										bind:value={editValue}
										onblur={commitEdit}
										onkeydown={onEditKey}
										use:focusAction
										class="block w-full border-0 bg-transparent px-2 py-1 font-mono text-xs text-slate-800 outline-sky-400 dark:text-zinc-200"
									/>
								{:else}
									<button
										type="button"
										onclick={() => startEdit(rIdx, cIdx)}
										class="block w-full px-2 py-1 text-left whitespace-nowrap text-slate-800 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
									>
										{cell === '' ? '\u00a0' : cell}
									</button>
								{/if}
							</td>
						{/each}
						<td class="border-b border-slate-100 dark:border-zinc-800"></td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<td
						colspan={columns.length + 2}
						class="border-t border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900"
					>
						<button
							type="button"
							onclick={addRow}
							class="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
						>
							+ row
						</button>
					</td>
				</tr>
			</tfoot>
		</table>
	</div>
</section>
