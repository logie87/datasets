<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let busy = $state<string | null>(null);
	let message = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);

	function formatBytes(n: number): string {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatTime(ms: number): string {
		return new Date(ms).toLocaleString(undefined, { hour12: false });
	}

	function flash(kind: 'ok' | 'err', text: string) {
		message = { kind, text };
		setTimeout(() => (message = null), 2000);
	}

	async function duplicate(name: string) {
		busy = name;
		try {
			const res = await fetch(`/api/samples/${encodeURIComponent(name)}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'duplicate' })
			});
			if (!res.ok) throw new Error((await res.text()) || res.statusText);
			const body = await res.json();
			await invalidateAll();
			flash('ok', `duplicated → ${body.name}`);
		} catch (e) {
			flash('err', e instanceof Error ? e.message : 'duplicate failed');
		} finally {
			busy = null;
		}
	}

	async function remove(name: string) {
		if (!confirm(`delete "${name}"? this cannot be undone.`)) return;
		busy = name;
		try {
			const res = await fetch(`/api/samples/${encodeURIComponent(name)}`, { method: 'DELETE' });
			if (!res.ok) throw new Error((await res.text()) || res.statusText);
			await invalidateAll();
			flash('ok', `deleted ${name}`);
		} catch (e) {
			flash('err', e instanceof Error ? e.message : 'delete failed');
		} finally {
			busy = null;
		}
	}

	function open(name: string) {
		goto(`/samples/${encodeURIComponent(name)}`);
	}
</script>

<section class="mx-auto max-w-3xl">
	<div class="flex items-baseline justify-between">
		<h1 class="font-mono text-base text-slate-700 dark:text-zinc-300">samples</h1>
		<span class="font-mono text-[11px] text-slate-500 dark:text-zinc-500">
			{data.files.length} file{data.files.length === 1 ? '' : 's'} · static/samples/
		</span>
	</div>
	<p class="mt-1 font-mono text-xs text-slate-500 dark:text-zinc-500">
		raw csv view + inline editor.
	</p>

	{#if message}
		<div
			class="mt-3 font-mono text-[11px]"
			class:text-emerald-600={message.kind === 'ok'}
			class:dark:text-emerald-500={message.kind === 'ok'}
			class:text-rose-500={message.kind === 'err'}
		>
			{message.text}
		</div>
	{/if}

	<div
		class="mt-4 overflow-hidden rounded border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
	>
		{#if data.files.length === 0}
			<p class="px-4 py-6 font-mono text-xs text-slate-500 dark:text-zinc-500">
				no csv files found in <span class="text-slate-700 dark:text-zinc-300">static/samples/</span
				>. drop one in and refresh.
			</p>
		{:else}
			<table class="min-w-full font-mono text-xs">
				<thead class="bg-slate-50 dark:bg-zinc-900">
					<tr class="text-left text-slate-500 dark:text-zinc-500">
						<th class="px-3 py-2 font-normal">name</th>
						<th class="px-3 py-2 text-right font-normal">size</th>
						<th class="px-3 py-2 font-normal">modified</th>
						<th class="px-3 py-2 text-right font-normal">actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.files as f (f.name)}
						<tr
							class="border-t border-slate-100 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
						>
							<td class="px-3 py-1.5">
								<a
									href="/samples/{encodeURIComponent(f.name)}"
									class="text-sky-700 hover:underline dark:text-sky-400"
								>
									{f.name}
								</a>
							</td>
							<td class="px-3 py-1.5 text-right text-slate-600 dark:text-zinc-400">
								{formatBytes(f.size)}
							</td>
							<td class="px-3 py-1.5 text-slate-500 dark:text-zinc-500">
								{formatTime(f.mtime)}
							</td>
							<td class="px-3 py-1.5 text-right">
								<div class="flex items-center justify-end gap-1">
									<button
										type="button"
										onclick={() => open(f.name)}
										class="rounded border border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
									>
										open
									</button>
									<button
										type="button"
										onclick={() => duplicate(f.name)}
										disabled={busy === f.name}
										class="rounded border border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
									>
										duplicate
									</button>
									<button
										type="button"
										onclick={() => remove(f.name)}
										disabled={busy === f.name}
										class="rounded border border-rose-300 px-1.5 py-0.5 text-[11px] text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
									>
										delete
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</section>
