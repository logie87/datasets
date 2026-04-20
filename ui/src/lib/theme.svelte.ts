import { browser } from '$app/environment';

type Mode = 'light' | 'dark';

function readInitialMode(): Mode {
	if (!browser) return 'dark';
	const stored = localStorage.getItem('theme');
	if (stored === 'light' || stored === 'dark') return stored;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function createTheme() {
	let mode = $state<Mode>(readInitialMode());

	function apply() {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', mode === 'dark');
		localStorage.setItem('theme', mode);
	}

	function toggle() {
		mode = mode === 'dark' ? 'light' : 'dark';
		apply();
	}

	return {
		get mode() {
			return mode;
		},
		toggle,
		apply
	};
}

export const theme = createTheme();
