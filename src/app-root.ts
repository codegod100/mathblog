import { Agent } from '@atproto/api'
import katex from 'katex'
import katexCss from 'katex/dist/katex.min.css?inline'
import { marked } from 'marked'
import Stackedit from 'stackedit-js'
import { LitElement, css, html, unsafeCSS } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

import { isLegacyRemote, listDocuments, listPublications, saveDocument } from './leaflet-api'
import { convertMarkdownToLeaflet } from './markdown'
import { createAgent, initOAuth, signIn, signOut, type OAuthSession } from './oauth'
import { loadDraft, saveDraft } from './storage'
import type { DocumentSummary, EditorDraft, PublicationRecord, SessionSummary, SiteStandardDocumentRecord } from './types'
import { parseMarkdownToMdDocument } from './panproto/markdown-instance'
import { importDocument } from './document-import'

function statusText(status: EditorDraft['status']) {
  switch (status) {
    case 'published':
      return 'Published'
    case 'repo-draft':
      return 'Repo draft'
    default:
      return 'Local draft'
  }
}

type MathToken = {
  key: string
  html: string
}

function renderMath(markdown: string): string {
  const tokens: MathToken[] = []
  let index = 0

  const stash = (htmlValue: string) => {
    const key = `@@KATEX_${index++}@@`
    tokens.push({ key, html: htmlValue })
    return key
  }

  const protectedMarkdown = markdown
    .replace(/```[\s\S]*?```/g, (match) => stash(match))
    .replace(/`[^`]+`/g, (match) => stash(match))

  const withDisplayMath = protectedMarkdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, expression: string) => {
    try {
      return stash(
        katex.renderToString(expression.trim(), {
          displayMode: true,
          throwOnError: false,
        }),
      )
    } catch {
      return `$$${expression}$$`
    }
  })

  const withInlineMath = withDisplayMath.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, expression: string) => {
    try {
      return stash(
        katex.renderToString(expression.trim(), {
          displayMode: false,
          throwOnError: false,
        }),
      )
    } catch {
      return `$${expression}$`
    }
  })

  let htmlOutput = marked.parse(withInlineMath, {
    breaks: true,
    gfm: true,
  }) as string

  for (const token of tokens) {
    htmlOutput = htmlOutput.replaceAll(token.key, token.html)
  }

  return htmlOutput
}

@customElement('app-root')
export class AppRoot extends LitElement {
  @state() private draft: EditorDraft = loadDraft()
  @state() private session?: OAuthSession
  @state() private sessionSummary?: SessionSummary
  @state() private publications: PublicationRecord[] = []
  @state() private documents: DocumentSummary[] = []
  @state() private handleInput = ''
  @state() private isBusy = true
  @state() private isSaving = false
  @state() private statusMessage = 'Loading…'
  @state() private warnings: string[] = []
  @state() private selectedDocumentUri = ''

  private autosaveTimer?: number
  private stackedit = new Stackedit()
  private agent?: Agent

  connectedCallback(): void {
    super.connectedCallback()
    this.stackedit.on('fileChange', (file) => {
      this.applyDraftChange('markdown', file.content.text)
    })
  }

  async firstUpdated() {
    await this.initializeSession()
  }

  private async initializeSession() {
    this.isBusy = true
    this.statusMessage = 'Initializing browser auth…'

    try {
      const result = await initOAuth()
      if (result?.session) {
        this.session = result.session
        this.agent = createAgent(result.session)
        await this.populateSessionDetails()
        await this.refreshPublications()
        await this.refreshDocuments()
        this.statusMessage = result.state ? 'Signed in and callback processed.' : 'Session restored.'
      } else {
        this.statusMessage = 'Working locally. Sign in when you want repo access.'
      }
    } catch (error) {
      this.statusMessage = this.describeError(error, 'Failed to initialize OAuth')
    } finally {
      this.isBusy = false
    }
  }

  private async populateSessionDetails() {
    if (!this.agent || !this.session) return
    const profile = await this.agent.getProfile({ actor: this.session.sub })
    this.sessionSummary = {
      did: this.session.sub,
      handle: profile.data.handle,
    }
  }

  private scheduleAutosave() {
    window.clearTimeout(this.autosaveTimer)
    this.autosaveTimer = window.setTimeout(() => {
      saveDraft(this.draft)
      this.statusMessage = `Local draft saved at ${new Date().toLocaleTimeString()}`
    }, 1000)
  }

  private applyDraftChange<K extends keyof EditorDraft>(key: K, value: EditorDraft[K]) {
    this.draft = {
      ...this.draft,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }
    this.scheduleAutosave()
  }

  private saveImmediately() {
    saveDraft(this.draft)
    this.statusMessage = `Local draft saved at ${new Date().toLocaleTimeString()}`
  }

  private async beginSignIn() {
    if (!this.handleInput.trim()) {
      this.statusMessage = 'Enter a handle or DID to sign in.'
      return
    }

    this.statusMessage = 'Redirecting to your atproto provider…'
    await signIn(this.handleInput.trim())
  }

  private openStackEdit() {
    this.stackedit.openFile({
      name: `${this.draft.title || 'leaflet'}.md`,
      content: { text: this.draft.markdown },
    })
  }

  private async refreshPublications() {
    if (!this.agent) return
    try {
      this.publications = await listPublications(this.agent)
    } catch (error) {
      this.statusMessage = this.describeError(error, 'Failed to load publications')
    }
  }

  private async refreshDocuments() {
    if (!this.agent) return
    try {
      this.documents = await listDocuments(this.agent)
    } catch (error) {
      this.statusMessage = this.describeError(error, 'Failed to load documents')
    }
  }

  private async loadSelectedDocument() {
    if (!this.agent || !this.selectedDocumentUri) return

    const doc = this.documents.find((d) => d.uri === this.selectedDocumentUri)
    if (!doc) {
      this.statusMessage = 'Document not found in list'
      return
    }

    try {
      const result = importDocument(doc.record)
      this.draft = {
        ...this.draft,
        title: result.title,
        description: result.description,
        tags: result.tags,
        markdown: result.markdown,
        publicationUri: result.publicationUri,
        remote: { uri: doc.uri, cid: doc.cid, rkey: doc.rkey },
        status: result.publicationUri ? 'published' : 'repo-draft',
        updatedAt: new Date().toISOString(),
      }
      this.warnings = result.warnings
      saveDraft(this.draft)
      this.statusMessage = `Loaded: ${doc.title}`
    } catch (error) {
      this.statusMessage = this.describeError(error, 'Failed to load document')
    }
  }

  private buildRecord(mode: 'draft' | 'publish'): SiteStandardDocumentRecord {
    const did = this.session!.sub
    const mdDoc = parseMarkdownToMdDocument(this.draft)
    this.warnings = mdDoc.warnings

    const { pages, warnings: convertWarnings } = convertMarkdownToLeaflet(this.draft)
    this.warnings = [...mdDoc.warnings, ...convertWarnings]

    const title = this.draft.title.trim() || 'Untitled leaflet'
    const description = this.draft.description.trim()
    const tags = this.draft.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const publicationUri = this.draft.publicationUri.trim()
    const site = mode === 'publish' && publicationUri
      ? publicationUri
      : `https://leaflet.pub/p/${did}`

    const now = new Date().toISOString()

    return {
      $type: 'site.standard.document',
      site,
      title,
      publishedAt: now,
      path: '',
      content: {
        $type: 'pub.leaflet.content',
        pages,
      },
      ...(description ? { description } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      updatedAt: now,
    }
  }

  private async persistRemote(mode: 'draft' | 'publish') {
    if (!this.agent || !this.session) {
      this.statusMessage = 'Sign in before saving to the repo.'
      return
    }

    if (mode === 'publish' && !this.draft.publicationUri.trim()) {
      this.statusMessage = 'Choose or paste a publication URI before publishing.'
      return
    }

    this.isSaving = true
    try {
      const record = this.buildRecord(mode)

      let existing = this.draft.remote
      if (isLegacyRemote(existing)) {
        existing = undefined
      }

      const remote = await saveDocument(this.agent, record, existing)
      this.draft = {
        ...this.draft,
        remote,
        status: mode === 'publish' ? 'published' : 'repo-draft',
        updatedAt: new Date().toISOString(),
      }
      saveDraft(this.draft)
      this.statusMessage = `${mode === 'publish' ? 'Published' : 'Saved repo draft'}: ${remote.uri}`
    } catch (error) {
      this.statusMessage = this.describeError(error, `Failed to ${mode}`)
    } finally {
      this.isSaving = false
    }
  }

  private async handleSignOut() {
    try {
      await signOut(this.session)
      this.session = undefined
      this.sessionSummary = undefined
      this.agent = undefined
      this.publications = []
      this.documents = []
      this.selectedDocumentUri = ''
      this.statusMessage = 'Signed out. Local draft kept in browser storage.'
    } catch (error) {
      this.statusMessage = this.describeError(error, 'Failed to sign out')
    }
  }

  private describeError(error: unknown, fallback: string): string {
    if (error instanceof Error) {
      return `${fallback}: ${error.message}`
    }
    return fallback
  }

  render() {
    const { pages: previewPages, warnings: previewWarnings } = convertMarkdownToLeaflet(this.draft)
    const livePreviewHtml = renderMath(this.draft.markdown)

    return html`
      <main>
        <section class="hero">
          <p class="eyebrow">AT Protocol + Leaflet + StackEdit</p>
          <h1>Browser-only Leaflet markdown editor</h1>
            <p class="lede">
            Write in StackEdit, keep one private local draft, then save a repo draft or
            publish to a <code>site.standard.publication</code> when you're ready.
          </p>
        </section>

        <section class="panel grid auth-panel">
          <div>
            <h2>Session</h2>
            <p class="muted">OAuth runs entirely in the browser on <code>127.0.0.1:6080</code>.</p>
            <p class="status-pill">${this.sessionSummary ? `Signed in as ${this.sessionSummary.handle}` : 'Local mode'}</p>
            ${this.sessionSummary
              ? html`<p class="mono">${this.sessionSummary.did}</p>`
              : html`<label>
                  <span>Handle or DID</span>
                  <input
                    .value=${this.handleInput}
                    @input=${(event: Event) => {
                      this.handleInput = (event.target as HTMLInputElement).value
                    }}
                    placeholder="your.handle.example"
                  />
                </label>`}
          </div>
          <div class="actions top-gap">
            ${this.sessionSummary
              ? html`<button @click=${this.handleSignOut}>Sign out</button>`
              : html`<button ?disabled=${this.isBusy} @click=${this.beginSignIn}>Sign in</button>`}
            <button class="secondary" @click=${this.openStackEdit}>Open StackEdit</button>
          </div>
        </section>

        <section class="panel editor-panel">
          <div class="panel-header">
            <h2>Draft</h2>
            <span class="status-pill">${statusText(this.draft.status)}</span>
          </div>

          <div class="draft-meta-grid">
            <label>
              <span>Title</span>
              <input
                .value=${this.draft.title}
                @input=${(event: Event) => this.applyDraftChange('title', (event.target as HTMLInputElement).value)}
                @blur=${this.saveImmediately}
              />
            </label>

            <label>
              <span>Tags</span>
              <input
                .value=${this.draft.tags}
                @input=${(event: Event) => this.applyDraftChange('tags', (event.target as HTMLInputElement).value)}
                @blur=${this.saveImmediately}
                placeholder="essay, notes, math"
              />
            </label>
          </div>

          <label>
            <span>Description</span>
            <textarea
              rows="3"
              .value=${this.draft.description}
              @input=${(event: Event) => this.applyDraftChange('description', (event.target as HTMLTextAreaElement).value)}
              @blur=${this.saveImmediately}
            ></textarea>
          </label>

          <div class="editor-workspace">
            <label>
              <span>Markdown</span>
              <textarea
                class="editor"
                rows="18"
                .value=${this.draft.markdown}
                @input=${(event: Event) => this.applyDraftChange('markdown', (event.target as HTMLTextAreaElement).value)}
                @blur=${this.saveImmediately}
              ></textarea>
            </label>

            <section class="live-preview-panel">
              <div class="live-preview-header">
                <span>Live preview</span>
              </div>
              <article class="live-preview-content">${unsafeHTML(livePreviewHtml)}</article>
            </section>
          </div>
        </section>

        <section class="panel save-panel">
          <div class="panel-header">
            <h2>Publication + Save</h2>
            <div class="actions">
              <button class="secondary small" ?disabled=${!this.sessionSummary} @click=${this.refreshPublications}>Refresh pubs</button>
              <button class="secondary small" ?disabled=${!this.sessionSummary} @click=${this.refreshDocuments}>Refresh docs</button>
            </div>
          </div>

          <div class="save-grid-3col">
            <label>
              <span>Open existing article</span>
              <select
                .value=${this.selectedDocumentUri}
                @change=${(event: Event) => {
                  this.selectedDocumentUri = (event.target as HTMLSelectElement).value
                  if (this.selectedDocumentUri) this.loadSelectedDocument()
                }}
              >
                <option value="">New article</option>
                ${this.documents.map(
                  (doc) => html`<option value=${doc.uri}>${doc.title}</option>`,
                )}
              </select>
            </label>

            <label>
              <span>Choose publication</span>
              <select
                .value=${this.draft.publicationUri}
                @change=${(event: Event) => this.applyDraftChange('publicationUri', (event.target as HTMLSelectElement).value)}
                @blur=${this.saveImmediately}
              >
                <option value="">No publication selected</option>
                ${this.publications.map(
                  (publication) => html`<option value=${publication.uri}>${publication.name}</option>`,
                )}
              </select>
            </label>

            <label>
              <span>Publication AT-URI fallback</span>
              <input
                .value=${this.draft.publicationUri}
                @input=${(event: Event) =>
                  this.applyDraftChange('publicationUri', (event.target as HTMLInputElement).value)}
                @blur=${this.saveImmediately}
                placeholder="at://did:plc:.../site.standard.publication/..."
              />
            </label>
          </div>

          <div class="actions">
            <button class="secondary" @click=${this.saveImmediately}>Save local draft</button>
            <button ?disabled=${!this.sessionSummary || this.isSaving} @click=${() => this.persistRemote('draft')}>
              Save draft to repo
            </button>
            <button class="accent" ?disabled=${!this.sessionSummary || this.isSaving} @click=${() => this.persistRemote('publish')}>
              Publish
            </button>
          </div>

          <div class="save-meta-grid">
            <div class="meta-box">
              <h3>Remote record</h3>
              ${this.draft.remote
                ? html`
                    <p class="mono">URI: ${this.draft.remote.uri}</p>
                    <p class="mono">CID: ${this.draft.remote.cid}</p>
                    ${isLegacyRemote(this.draft.remote)
                      ? html`<p class="warning">Legacy pub.leaflet.document — next save creates a new site.standard.document</p>`
                      : ''}
                  `
                : html`<p class="muted">No repo record yet.</p>`}
            </div>

            <div class="meta-box">
              <h3>Status</h3>
              <p>${this.statusMessage}</p>
              <p class="muted">Last updated: ${new Date(this.draft.updatedAt).toLocaleString()}</p>
            </div>

            <div class="meta-box">
              <h3>Conversion warnings</h3>
              ${this.warnings.length > 0
                ? html`<ul>${this.warnings.map((warning) => html`<li>${warning}</li>`)}</ul>`
                : html`<p class="muted">No conversion warnings yet.</p>`}
            </div>
          </div>
        </section>

        <section class="panel preview">
          <div class="panel-header">
            <h2>Generated record preview</h2>
            <span class="status-pill">${previewPages[0].blocks.length} blocks</span>
          </div>
          <pre>${JSON.stringify(
            isLegacyRemote(this.draft.remote) ? '(legacy remote — will create new site.standard.document on save)' : null,
            null,
            2,
          )}${JSON.stringify(
            (() => {
              const did = this.sessionSummary?.did ?? 'did:example:local'
              const title = this.draft.title.trim() || 'Untitled leaflet'
              const description = this.draft.description.trim()
              const tags = this.draft.tags.split(',').map((t) => t.trim()).filter(Boolean)
              const publicationUri = this.draft.publicationUri.trim()
              const site = publicationUri || `https://leaflet.pub/p/${did}`
              const now = new Date().toISOString()
              return {
                $type: 'site.standard.document',
                site,
                title,
                publishedAt: now,
                path: '/<rkey>',
                content: { $type: 'pub.leaflet.content', pages: previewPages },
                ...(description ? { description } : {}),
                ...(tags.length > 0 ? { tags } : {}),
                updatedAt: now,
                warnings: previewWarnings,
              }
            })(),
            null,
            2,
          )}</pre>
        </section>
      </main>
    `
  }

  static styles = css`
    ${unsafeCSS(katexCss)}

    :host {
      color: #ebedf7;
      display: block;
      min-height: 100svh;
      background:
        radial-gradient(circle at top, rgba(125, 92, 255, 0.24), transparent 35%),
        linear-gradient(180deg, #0f1020 0%, #080913 100%);
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    }

    main {
      width: min(1200px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 48px;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    .hero,
    .panel {
      background: rgba(15, 18, 35, 0.88);
      border: 1px solid rgba(136, 143, 193, 0.22);
      border-radius: 24px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
    }

    .hero {
      padding: 36px;
      margin-bottom: 20px;
    }

    .eyebrow {
      color: #9bb2ff;
      font-size: 0.85rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    h1 {
      font-size: clamp(2rem, 5vw, 3.8rem);
      line-height: 0.96;
      letter-spacing: -0.05em;
      margin-bottom: 12px;
      max-width: 12ch;
    }

    .lede {
      color: #b4bbd6;
      max-width: 60ch;
      line-height: 1.5;
    }

    .grid {
      display: grid;
      gap: 20px;
    }

    .auth-panel {
      grid-template-columns: 1.2fr 0.8fr;
      margin-bottom: 20px;
    }

    .panel {
      padding: 24px;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(108, 130, 255, 0.18);
      color: #dbe4ff;
      font-size: 0.9rem;
    }

    .muted {
      color: #9ca5c4;
    }

    .mono {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      color: #b8f0d4;
      word-break: break-all;
    }

    .warning {
      color: #f0c060;
      font-style: italic;
    }

    label {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
    }

    label > span {
      color: #d4d9f1;
      font-size: 0.92rem;
    }

    input,
    textarea,
    select,
    button {
      font: inherit;
      border-radius: 16px;
      border: 1px solid rgba(136, 143, 193, 0.28);
      background: rgba(8, 11, 24, 0.95);
      color: inherit;
    }

    input,
    textarea,
    select {
      padding: 14px 16px;
    }

    textarea {
      resize: vertical;
    }

    .editor {
      min-height: 360px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      line-height: 1.5;
    }

    .editor-workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .editor-panel,
    .save-panel {
      margin-bottom: 20px;
    }

    .draft-meta-grid,
    .save-grid,
    .save-grid-3col,
    .save-meta-grid {
      display: grid;
      gap: 16px;
    }

    .draft-meta-grid,
    .save-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .save-grid-3col {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .save-meta-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-top: 18px;
    }

    .editor-workspace > label {
      margin-bottom: 0;
    }

    .live-preview-panel {
      border-radius: 18px;
      background: rgba(5, 7, 15, 0.9);
      border: 1px solid rgba(136, 143, 193, 0.22);
      overflow: hidden;
      min-height: 100%;
    }

    .live-preview-header {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(136, 143, 193, 0.18);
      color: #d4d9f1;
      font-size: 0.92rem;
      background: rgba(14, 18, 33, 0.9);
    }

    .live-preview-content {
      padding: 18px;
      color: #d9deef;
      line-height: 1.7;
      overflow: auto;
      max-height: 620px;
    }

    .live-preview-content :first-child {
      margin-top: 0;
    }

    .live-preview-content :last-child {
      margin-bottom: 0;
    }

    .live-preview-content h1,
    .live-preview-content h2,
    .live-preview-content h3,
    .live-preview-content h4,
    .live-preview-content h5,
    .live-preview-content h6 {
      line-height: 1.1;
      letter-spacing: -0.03em;
      margin: 1.3em 0 0.55em;
    }

    .live-preview-content h1 {
      font-size: 2rem;
    }

    .live-preview-content h2 {
      font-size: 1.5rem;
    }

    .live-preview-content h3 {
      font-size: 1.2rem;
    }

    .live-preview-content p,
    .live-preview-content ul,
    .live-preview-content ol,
    .live-preview-content blockquote,
    .live-preview-content pre {
      margin: 0 0 1em;
    }

    .live-preview-content ul,
    .live-preview-content ol {
      padding-left: 1.35rem;
    }

    .live-preview-content a {
      color: #8bd0ff;
    }

    .live-preview-content blockquote {
      padding: 0.2rem 0 0.2rem 1rem;
      border-left: 3px solid rgba(125, 92, 255, 0.6);
      color: #b8c1dd;
    }

    .live-preview-content code {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.92em;
      padding: 0.12rem 0.38rem;
      border-radius: 0.45rem;
      background: rgba(125, 92, 255, 0.14);
    }

    .live-preview-content pre {
      padding: 14px 16px;
      border-radius: 16px;
      overflow: auto;
      background: rgba(11, 14, 26, 1);
      border: 1px solid rgba(136, 143, 193, 0.18);
    }

    .live-preview-content pre code {
      padding: 0;
      background: transparent;
    }

    .live-preview-content hr {
      border: 0;
      border-top: 1px solid rgba(136, 143, 193, 0.22);
      margin: 1.5rem 0;
    }

    button {
      cursor: pointer;
      padding: 12px 16px;
      transition: transform 0.12s ease, border-color 0.12s ease;
    }

    button:hover {
      transform: translateY(-1px);
      border-color: rgba(170, 181, 255, 0.55);
    }

    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }

    .secondary {
      background: rgba(80, 97, 177, 0.18);
    }

    .accent {
      background: linear-gradient(135deg, #7d5cff, #36c6ff);
      color: #06101f;
      font-weight: 700;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .top-gap {
      align-content: end;
      justify-content: flex-start;
    }

    .small {
      padding: 8px 12px;
      font-size: 0.88rem;
    }

    .meta-box {
      margin-top: 18px;
      padding: 16px;
      border-radius: 18px;
      background: rgba(7, 9, 18, 0.72);
      border: 1px solid rgba(136, 143, 193, 0.2);
      display: grid;
      gap: 8px;
    }

    .preview pre {
      margin: 0;
      padding: 16px;
      overflow: auto;
      border-radius: 18px;
      background: rgba(5, 7, 15, 0.95);
      border: 1px solid rgba(136, 143, 193, 0.22);
      color: #bce6d2;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.9rem;
      line-height: 1.45;
    }

    ul {
      margin: 0;
      padding-left: 20px;
    }

    @media (max-width: 900px) {
      main {
        width: min(100%, calc(100% - 20px));
        padding-top: 20px;
      }

      .hero,
      .panel {
        border-radius: 20px;
      }

      .auth-panel,
      .draft-meta-grid,
      .save-grid,
      .save-grid-3col,
      .save-meta-grid,
      .editor-workspace {
        grid-template-columns: 1fr;
      }

      .panel {
        padding: 18px;
      }

      h1 {
        max-width: none;
      }
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'app-root': AppRoot
  }
}
