import type { EditorDraft } from './types'

export const APP_PORT = 6080
export const APP_ORIGIN = `http://127.0.0.1:${APP_PORT}`
export const CALLBACK_PATH = '/oauth/callback'
export const CALLBACK_URL = `${APP_ORIGIN}${CALLBACK_PATH}`
export const DRAFT_STORAGE_KEY = 'leaflet-editor:active-draft'
export const DEFAULT_SCOPE = 'atproto transition:generic'
export const PUBLICATION_COLLECTION = 'pub.leaflet.publication'
export const DOCUMENT_COLLECTION = 'pub.leaflet.document'

export const DEFAULT_MARKDOWN = `# Untitled leaflet\n\nStart writing here.\n\n- This editor keeps a private local draft\n- Save to repo only when you choose\n- Publish attaches the document to a Leaflet publication\n`

export const DEFAULT_DRAFT: EditorDraft = {
  title: 'Untitled leaflet',
  description: '',
  tags: '',
  markdown: DEFAULT_MARKDOWN,
  publicationUri: '',
  status: 'local-draft',
  updatedAt: new Date(0).toISOString(),
}
