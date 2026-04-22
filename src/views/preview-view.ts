import { ItemView, WorkspaceLeaf } from "obsidian";
import { renderMath } from "../atproto/render-markdown";

export const VIEW_TYPE_MATHBLOG_PREVIEW = "mathblog-preview";

let katexCssInjected = false;

function ensureKatexCss() {
	if (katexCssInjected) return;
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css';
	document.head.appendChild(link);
	katexCssInjected = true;
}

export class PreviewView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_MATHBLOG_PREVIEW;
	}

	getDisplayText(): string {
		return "Leaflet Preview";
	}

	async onOpen() {
		ensureKatexCss();
		this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
			this.render();
		}));
		this.registerEvent(this.app.vault.on('modify', () => {
			this.render();
		}));
		await this.render();
	}

	async onClose() {
		// Nothing to clean up
	}

	async render() {
		const file = this.app.workspace.getActiveFile();
		this.contentEl.empty();

		if (!file) {
			this.contentEl.createEl('p', { text: 'No active file', cls: 'mathblog-preview-empty' });
			return;
		}

		const content = await this.app.vault.read(file);
		const body = content.replace(/---\n[\s\S]*?\n---\n?/, '').trim();

		const container = this.contentEl.createDiv({ cls: 'mathblog-preview prose' });
		container.innerHTML = renderMath(body);
	}
}
