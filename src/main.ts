import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, MathblogSettings, SettingTab } from "./settings";
import { AtpAuthManager } from "./auth";
import { PreviewView, VIEW_TYPE_MATHBLOG_PREVIEW } from "./views/preview-view";
import { publishNote } from "./commands/publish";

// Bump this whenever you update client-metadata.json on GitHub Pages
// so the PDS re-fetches it instead of using a stale cached version.
export const METADATA_CACHE_BUST = 'v=3';

export default class MathblogPlugin extends Plugin {
	settings: MathblogSettings = DEFAULT_SETTINGS;
	auth: AtpAuthManager;

	async onload() {
		await this.loadSettings();

		this.auth = new AtpAuthManager({
			plugin: this,
			protocolScheme: 'mathblog-oauth',
			clientId: `https://codegod100.github.io/mathblog/client-metadata.json?${METADATA_CACHE_BUST}`,
			redirectUri: 'https://codegod100.github.io/mathblog/oauth-callback.html',
			scope: 'atproto transition:generic',
		});
		await this.auth.initialize();

		this.registerView(VIEW_TYPE_MATHBLOG_PREVIEW, (leaf) => {
			return new PreviewView(leaf);
		});

		this.addRibbonIcon('file-text', 'Toggle Leaflet Preview', () => {
			void this.togglePreviewView();
		});

		this.addCommand({
			id: 'publish-note',
			name: 'Publish note to Leaflet',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (!checking) {
					void publishNote(this);
				}
				return true;
			},
		});

		this.addCommand({
			id: 'toggle-preview',
			name: 'Toggle Leaflet Preview',
			callback: () => {
				void this.togglePreviewView();
			},
		});

		this.addSettingTab(new SettingTab(this.app, this));
	}

	/** Convenience accessor for the authenticated AT Protocol client. */
	get client() {
		return this.auth.client;
	}

	async togglePreviewView() {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_MATHBLOG_PREVIEW);

		if (leaves.length > 0) {
			workspace.detachLeavesOfType(VIEW_TYPE_MATHBLOG_PREVIEW);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_MATHBLOG_PREVIEW });
			workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		const saved = await this.loadData() as Partial<MathblogSettings>;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {}
}
