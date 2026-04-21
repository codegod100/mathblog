import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, MathblogSettings, SettingTab } from "./settings";
import { ATClient } from "./api/client";
import { PreviewView, VIEW_TYPE_MATHBLOG_PREVIEW } from "./views/preview-view";
import { publishNote } from "./commands/publish";

export default class MathblogPlugin extends Plugin {
	settings: MathblogSettings = DEFAULT_SETTINGS;
	client: ATClient;

	async onload() {
		await this.loadSettings();
		this.client = new ATClient();

		this.registerObsidianProtocolHandler('mathblog-oauth', (params) => {
			try {
				const urlParams = new URLSearchParams();
				for (const [key, value] of Object.entries(params)) {
					if (value) {
						urlParams.set(key, String(value));
					}
				}
				this.client.handleOAuthCallback(urlParams);
				new Notice('Authentication completed!');
			} catch (error) {
				console.error('OAuth callback error:', error);
				new Notice('Authentication error.');
			}
		});

		this.registerView(VIEW_TYPE_MATHBLOG_PREVIEW, (leaf) => {
			return new PreviewView(leaf);
		});

		this.addRibbonIcon('file-text', 'Toggle Leaflet Preview', () => {
			void this.togglePreviewView();
		});

		this.addCommand({
			id: 'publish-note',
			name: 'Publish note to Leaflet',
			editorCheckCallback: (checking: boolean) => {
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

	async checkAuth(): Promise<boolean> {
		if (this.client.loggedIn) {
			return true;
		}
		if (this.settings.did) {
			try {
				await this.client.restoreSession(this.settings.did);
				return true;
			} catch (e) {
				console.error("Failed to restore session:", e);
				this.settings.did = undefined;
				await this.saveSettings();
				new Notice("Session expired. Please log in via settings.");
				return false;
			}
		}
		new Notice("Please log in via plugin settings.");
		return false;
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
