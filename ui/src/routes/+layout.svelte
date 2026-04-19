<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/theme.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => theme.apply());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>datasets — dev console</title>
</svelte:head>

<div
	class="min-h-screen bg-slate-100 text-slate-800 antialiased dark:bg-zinc-950 dark:text-zinc-400"
>
	<header class="border-b border-slate-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-900">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
			<div class="flex items-center gap-6">
				<a href="/" class="font-mono text-sm tracking-tight text-slate-700 dark:text-zinc-300">
					datasets://dev-console
				</a>
				<nav class="flex items-center gap-4 font-mono text-xs">
					<a
						href="/"
						class="text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-zinc-300"
					>
						console
					</a>
					<a
						href="/samples"
						class="text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-zinc-300"
					>
						samples
					</a>
				</nav>
			</div>
			<div class="flex items-center gap-4 text-xs">
				<a
					href="https://github.com/logie87/datasets"
					target="_blank"
					rel="noreferrer"
					class="font-mono text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-zinc-300"
				>
					github
				</a>
				<button
					type="button"
					onclick={theme.toggle}
					aria-label="Toggle theme"
					class="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
				>
					{theme.mode === 'dark' ? '☾ dark' : '☼ light'}
				</button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-6 py-6">
		{@render children()}
	</main>
</div>
