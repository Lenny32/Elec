/** Browser/device state: connectivity, PWA install prompt, persistent storage. */

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class Device {
	online = $state(true);
	installable = $state(false);
	installed = $state(false);
	#prompt: BeforeInstallPromptEvent | null = null;
	#started = false;

	start() {
		if (this.#started || typeof window === 'undefined') return;
		this.#started = true;
		this.online = navigator.onLine;
		addEventListener('online', () => (this.online = true));
		addEventListener('offline', () => (this.online = false));
		addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.#prompt = e as BeforeInstallPromptEvent;
			this.installable = true;
		});
		addEventListener('appinstalled', () => {
			this.installed = true;
			this.installable = false;
		});
		this.installed = matchMedia('(display-mode: standalone)').matches;
	}

	async install() {
		if (!this.#prompt) return;
		await this.#prompt.prompt();
		const choice = await this.#prompt.userChoice;
		if (choice.outcome === 'accepted') this.installed = true;
		this.#prompt = null;
		this.installable = false;
	}

	async storagePersisted(): Promise<boolean> {
		return (await navigator.storage?.persisted?.()) ?? false;
	}

	async requestPersistence(): Promise<boolean> {
		return (await navigator.storage?.persist?.()) ?? false;
	}
}

export const device = new Device();

/** Triggers a browser download of text content. */
export function downloadText(filename: string, text: string, type = 'application/json') {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
