import katexCss from 'katex/dist/katex.min.css?inline'
import { LitElement, css, html, unsafeCSS } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

import { getPublicDocument } from './leaflet-api'
import { lexiconToArticle } from './panproto/lens-b'
import { articleToMdDocument } from './panproto/lens-a'
import { emitMarkdownFromMdDocument } from './panproto/markdown-instance'
import { renderMath } from './render-markdown'
import type { SiteStandardDocumentRecord } from './types'

@customElement('article-view')
export class ArticleView extends LitElement {
  @state() private articleTitle = ''
  @state() private articleDescription = ''
  @state() private articleTags: string[] = []
  @state() private publishedAt = ''
  @state() private bodyHtml = ''
  @state() private loading = true
  @state() private error = ''
  @state() private warnings: string[] = []

  private did = ''
  private rkey = ''

  connectedCallback(): void {
    super.connectedCallback()
  }

  async firstUpdated() {
    this.did = this.getAttribute('did') ?? ''
    this.rkey = this.getAttribute('rkey') ?? ''

    if (!this.did || !this.rkey) {
      this.error = 'Missing did or rkey in URL.'
      this.loading = false
      return
    }

    try {
      const record = await getPublicDocument(this.did, this.rkey)
      this.renderRecord(record)
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load article'
    } finally {
      this.loading = false
    }
  }

  private renderRecord(record: SiteStandardDocumentRecord) {
    const { article, warnings } = lexiconToArticle(record)
    this.warnings = warnings
    this.articleTitle = article.title
    this.articleDescription = article.description
    this.articleTags = article.tags
    this.publishedAt = record.publishedAt ?? ''

    const mdDoc = articleToMdDocument(article)
    const markdown = emitMarkdownFromMdDocument(mdDoc)
    this.bodyHtml = renderMath(markdown)
  }

  static styles = css`
    ${unsafeCSS(katexCss)}

    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      background: #0b0f1e;
      color: #d9deef;
      min-height: 100vh;
    }

    .article-shell {
      max-width: 740px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }

    .article-meta {
      margin-bottom: 36px;
    }

    .article-title {
      font-size: clamp(1.8rem, 4vw, 2.6rem);
      line-height: 1.1;
      letter-spacing: -0.04em;
      margin: 0 0 12px;
      color: #eef2ff;
    }

    .article-description {
      color: #b4bbd6;
      line-height: 1.5;
      margin: 0 0 16px;
    }

    .article-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0 0 12px;
    }

    .article-tag {
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.82rem;
      background: rgba(125, 92, 255, 0.14);
      border: 1px solid rgba(136, 143, 193, 0.22);
      color: #c4b5fd;
    }

    .article-date {
      color: #8a8fb5;
      font-size: 0.85rem;
    }

    .article-warnings {
      margin: 0 0 20px;
      padding: 12px 16px;
      border-radius: 12px;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #fbbf24;
      font-size: 0.88rem;
    }

    .article-body {
      line-height: 1.7;
    }

    .article-body :first-child {
      margin-top: 0;
    }

    .article-body :last-child {
      margin-bottom: 0;
    }

    .article-body h1,
    .article-body h2,
    .article-body h3,
    .article-body h4,
    .article-body h5,
    .article-body h6 {
      line-height: 1.1;
      letter-spacing: -0.03em;
      margin: 1.3em 0 0.55em;
    }

    .article-body h1 { font-size: 2rem; }
    .article-body h2 { font-size: 1.5rem; }
    .article-body h3 { font-size: 1.2rem; }

    .article-body p,
    .article-body ul,
    .article-body ol,
    .article-body blockquote,
    .article-body pre {
      margin: 0 0 1em;
    }

    .article-body ul,
    .article-body ol {
      padding-left: 1.35rem;
    }

    .article-body a {
      color: #8bd0ff;
    }

    .article-body blockquote {
      padding: 0.2rem 0 0.2rem 1rem;
      border-left: 3px solid rgba(125, 92, 255, 0.6);
      color: #b8c1dd;
    }

    .article-body code {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.92em;
      padding: 0.12rem 0.38rem;
      border-radius: 0.45rem;
      background: rgba(125, 92, 255, 0.14);
    }

    .article-body pre {
      padding: 14px 16px;
      border-radius: 16px;
      overflow: auto;
      background: rgba(11, 14, 26, 1);
      border: 1px solid rgba(136, 143, 193, 0.18);
    }

    .article-body pre code {
      padding: 0;
      background: transparent;
    }

    .article-body hr {
      border: 0;
      border-top: 1px solid rgba(136, 143, 193, 0.22);
      margin: 1.5rem 0;
    }

    .article-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 1em;
      display: block;
      overflow-x: auto;
    }

    .article-body th,
    .article-body td {
      padding: 0.7rem 0.85rem;
      border: 1px solid rgba(136, 143, 193, 0.22);
      text-align: left;
      vertical-align: top;
    }

    .article-body th {
      color: #eef2ff;
      background: rgba(125, 92, 255, 0.16);
      font-weight: 600;
    }

    .article-body td {
      color: #d9deef;
    }

    .article-body tbody tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.025);
    }

    .loading-state,
    .error-state {
      text-align: center;
      padding: 80px 24px;
    }

    .error-state {
      color: #f87171;
    }

    .back-link {
      display: inline-block;
      margin-bottom: 20px;
      color: #8bd0ff;
      text-decoration: none;
      font-size: 0.9rem;
    }

    .back-link:hover {
      text-decoration: underline;
    }
  `

  render() {
    if (this.loading) {
      return html`<div class="loading-state">Loading article…</div>`
    }

    if (this.error) {
      return html`
        <div class="article-shell">
          <a href="/" class="back-link">&larr; Back to editor</a>
          <div class="error-state">
            <p>${this.error}</p>
          </div>
        </div>
      `
    }

    return html`
      <div class="article-shell">
        <a href="/" class="back-link">&larr; Back to editor</a>

        <div class="article-meta">
          <h1 class="article-title">${this.articleTitle}</h1>
          ${this.articleDescription
            ? html`<p class="article-description">${this.articleDescription}</p>`
            : ''}
          ${this.articleTags.length > 0
            ? html`<div class="article-tags">
                ${this.articleTags.map((t) => html`<span class="article-tag">${t}</span>`)}
              </div>`
            : ''}
          ${this.publishedAt
            ? html`<p class="article-date">Published ${new Date(this.publishedAt).toLocaleDateString()}</p>`
            : ''}
        </div>

        ${this.warnings.length > 0
          ? html`<div class="article-warnings">
              ${this.warnings.map((w) => html`<p>${w}</p>`)}
            </div>`
          : ''}

        <article class="article-body">${unsafeHTML(this.bodyHtml)}</article>
      </div>
    `
  }
}
