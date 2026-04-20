import { DEFAULT_DRAFT, DRAFT_STORAGE_KEY } from './constants'
import type { DraftRecordRef, EditorDraft } from './types'

function isValidDocumentRemote(remote: unknown): remote is DraftRecordRef {
  if (!remote || typeof remote !== 'object') return false
  const v = remote as Record<string, unknown>
  return typeof v.uri === 'string'
    && v.uri.includes('/site.standard.document/')
    && typeof v.cid === 'string'
    && typeof v.rkey === 'string'
}

export function loadDraft(): EditorDraft {
  const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) {
    return { ...DEFAULT_DRAFT, updatedAt: new Date().toISOString() }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<EditorDraft>
    let remote = parsed.remote
    let status: EditorDraft['status'] = parsed.status ?? DEFAULT_DRAFT.status
    if (!isValidDocumentRemote(remote)) {
      remote = undefined
      if (status === 'repo-draft' || status === 'published') {
        status = 'local-draft'
      }
    }
    return {
      ...DEFAULT_DRAFT,
      ...parsed,
      remote,
      status,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return { ...DEFAULT_DRAFT, updatedAt: new Date().toISOString() }
  }
}

export function saveDraft(draft: EditorDraft): void {
  window.localStorage.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
  )
}
