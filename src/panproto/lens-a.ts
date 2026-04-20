import type { LensHandle } from '@panproto/core'

import { getPanproto } from './init'
import { buildSchemas } from './schemas'

let cachedLens: LensHandle | null = null
let cachedSchemas: ReturnType<typeof buildSchemas> | null = null

export async function getSchemas() {
  if (cachedSchemas) return cachedSchemas
  const p = await getPanproto()
  cachedSchemas = buildSchemas(p)
  return cachedSchemas
}

export async function getLens(): Promise<LensHandle> {
  if (cachedLens) return cachedLens
  const p = await getPanproto()
  const { markdownDocument, editorArticle } = await getSchemas()
  cachedLens = p.lens(markdownDocument, editorArticle)
  return cachedLens
}

export async function markdownToArticle(mdInstance: object): Promise<unknown> {
  const p = await getPanproto()
  const { markdownDocument, editorArticle } = await getSchemas()
  return p.convert(mdInstance, { from: markdownDocument, to: editorArticle })
}

export async function articleToMarkdown(articleInstance: object): Promise<unknown> {
  const p = await getPanproto()
  const { markdownDocument, editorArticle } = await getSchemas()
  return p.convert(articleInstance, { from: editorArticle, to: markdownDocument })
}
