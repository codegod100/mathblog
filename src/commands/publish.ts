import { Notice, TFile, Modal, Setting, App } from "obsidian";
import type MathblogPlugin from "../main";
import { parseMarkdownToMdDocument } from "../panproto/markdown-instance";
import { mdDocumentToArticle } from "../panproto/lens-a";
import { articleToLexicon } from "../panproto/lens-b";
import { saveDocument, listPublications } from "../atproto/leaflet-api";

export async function publishNote(plugin: MathblogPlugin) {
	const file = plugin.app.workspace.getActiveFile();
	if (!file) {
		new Notice("No active file to publish.");
		return;
	}

	if (!await plugin.auth.checkAuth()) {
		return;
	}

	try {
		const { record, existingUri } = await buildRecord(plugin, file);
		const publicationUri = record.site;

		if (!publicationUri) {
			new Notice("No publication selected. Please choose a publication.");
			return;
		}

		const did = plugin.auth.did!;
		const result = await saveDocument(
			plugin.client,
			did,
			record,
			existingUri ? { uri: existingUri, cid: '', rkey: existingUri.split('/').at(-1) ?? '' } : undefined
		);

		await plugin.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			fm['leaflet_document'] = result.uri;
			fm['leaflet_publication'] = publicationUri;
			fm['leaflet_rkey'] = result.rkey;
			fm['publishedAt'] = record.publishedAt;
			fm['updatedAt'] = record.updatedAt;
		});

		new Notice(`Published "${record.title}" successfully!`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Publish failed: ${message}`);
		console.error("Publish error:", error);
	}
}

async function buildRecord(plugin: MathblogPlugin, file: TFile) {
	const fullText = await plugin.app.vault.read(file);
	let frontmatter: Record<string, unknown> = {};
	await plugin.app.fileManager.processFrontMatter(file, (fm) => {
		frontmatter = fm;
	});

	const content = fullText.replace(/---\n[\s\S]*?\n---\n?/, '').trim();

	let title = frontmatter['title'] as string | undefined;
	if (!title) {
		const h1Match = content.match(/^# (.+)$/m);
		title = h1Match ? h1Match[1].trim() : file.basename;
	}

	const description = frontmatter['description'] as string | undefined;
	const tags = parseTags(frontmatter['tags']);
	let publicationUri = frontmatter['leaflet_publication'] as string | undefined;
	const existingUri = frontmatter['leaflet_document'] as string | undefined;

	if (!publicationUri) {
		publicationUri = plugin.settings.defaultPublicationUri;
	}

	if (!publicationUri) {
		const pubs = await listPublications(plugin.client, plugin.auth.did!);
		const selected = await new PublicationModal(plugin.app, pubs).awaitSelection();
		publicationUri = selected;
		if (!publicationUri) {
			throw new Error("No publication selected");
		}
	}

	const draft = {
		title: title || 'Untitled',
		description: description || '',
		tags: tags.join(', '),
		markdown: content,
		publicationUri: publicationUri || '',
		status: 'local-draft' as const,
		updatedAt: new Date().toISOString(),
	};

	const mdDoc = parseMarkdownToMdDocument(draft);
	const article = mdDocumentToArticle(mdDoc);
	article.title = title || 'Untitled';
	article.description = description || '';
	article.tags = tags;

	const now = new Date().toISOString();
	const site = publicationUri || `https://leaflet.pub/p/${plugin.auth.did}`;

	const record = articleToLexicon(article, {
		site,
		publishedAt: now,
		path: '',
	});

	return { record, existingUri };
}

function parseTags(tags: unknown): string[] {
	if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === 'string');
	if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean);
	return [];
}

class PublicationModal extends Modal {
	private resolve: ((value: string | undefined) => void) | null = null;

	constructor(app: App, private publications: Array<{ uri: string; name: string }>) {
		super(app);
	}

	awaitSelection(): Promise<string | undefined> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onClose() {
		if (this.resolve) {
			this.resolve(undefined);
			this.resolve = null;
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: 'Select publication' });

		for (const pub of this.publications) {
			new Setting(contentEl)
				.setName(pub.name)
				.addButton(btn => btn
					.setButtonText('Select')
					.onClick(() => {
						if (this.resolve) {
							this.resolve(pub.uri);
							this.resolve = null;
							this.close();
						}
					})
				);
		}

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => {
					this.close();
				})
			);
	}
}
