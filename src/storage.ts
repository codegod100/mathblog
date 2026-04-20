import { DEFAULT_DRAFT, DRAFT_STORAGE_KEY } from './constants'
import type { EditorDraft } from './types'

export function loadDraft(): EditorDraft {
  const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) {
    return { ...DEFAULT_DRAFT, updatedAt: new Date().toISOString() }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<EditorDraft>
    return {
      ...DEFAULT_DRAFT,
      ...parsed,
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
