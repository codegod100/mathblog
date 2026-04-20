import type { LensHandle } from '@panproto/core'

import { getPanproto } from './init'
import { buildSchemas } from './schemas'
import type { MdBlock, MdDocument, MdListItem, Segment } from './markdown-instance'

export type ArticleSegment = {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strikethrough?: boolean
  linkUri?: string
}

export type ArticleListItem = {
  segments: ArticleSegment[]
  checked?: boolean
  children: ArticleListItem[]
}

export type ArticleBlock =
  | { $type: 'header'; level: number; segments: ArticleSegment[] }
  | { $type: 'text'; segments: ArticleSegment[] }
  | { $type: 'blockquote'; segments: ArticleSegment[] }
  | { $type: 'code'; text: string; language?: string }
  | { $type: 'horizontalRule' }
  | { $type: 'unorderedList'; items: ArticleListItem[] }
  | { $type: 'orderedList'; startIndex?: number; items: ArticleListItem[] }
  | { $type: 'math'; tex: string }

export type Article = {
  title: string
  description: string
  tags: string[]
  site: string
  blocks: ArticleBlock[]
}

function convertSegment(seg: Segment): ArticleSegment {
  const result: ArticleSegment = { text: seg.text }
  if (seg.bold) result.bold = true
  if (seg.italic) result.italic = true
  if (seg.code) result.code = true
  if (seg.strikethrough) result.strikethrough = true
  if (seg.linkUri) result.linkUri = seg.linkUri
  return result
}

function convertListItem(item: MdListItem): ArticleListItem {
  const result: ArticleListItem = {
    segments: item.segments.map(convertSegment),
    children: item.children.map(convertListItem),
  }
  if (typeof item.checked === 'boolean') result.checked = item.checked
  return result
}

function convertBlock(block: MdBlock): ArticleBlock {
  switch (block.$type) {
    case 'heading':
      return { $type: 'header', level: block.level, segments: block.segments.map(convertSegment) }
    case 'paragraph':
      return { $type: 'text', segments: block.segments.map(convertSegment) }
    case 'blockquote':
      return { $type: 'blockquote', segments: block.segments.map(convertSegment) }
    case 'code':
      return { $type: 'code', text: block.text, ...(block.language ? { language: block.language } : {}) }
    case 'horizontalRule':
      return { $type: 'horizontalRule' }
    case 'unorderedList':
      return { $type: 'unorderedList', items: block.items.map(convertListItem) }
    case 'orderedList': {
      const result: ArticleBlock = { $type: 'orderedList', items: block.items.map(convertListItem) }
      if (typeof block.startIndex === 'number') (result as { $type: 'orderedList'; startIndex?: number; items: ArticleListItem[] }).startIndex = block.startIndex
      return result
    }
    case 'math':
      return { $type: 'math', tex: block.tex }
  }
}

export function mdDocumentToArticle(mdDoc: MdDocument & { warnings?: string[] }): Article {
  return {
    title: mdDoc.title,
    description: mdDoc.description,
    tags: mdDoc.tags,
    site: mdDoc.publicationUri,
    blocks: mdDoc.blocks.map(convertBlock),
  }
}

function convertArticleSegment(seg: ArticleSegment): Segment {
  const result: Segment = { text: seg.text }
  if (seg.bold) result.bold = true
  if (seg.italic) result.italic = true
  if (seg.code) result.code = true
  if (seg.strikethrough) result.strikethrough = true
  if (seg.linkUri) result.linkUri = seg.linkUri
  return result
}

function convertArticleListItem(item: ArticleListItem): MdListItem {
  const result: MdListItem = {
    segments: item.segments.map(convertArticleSegment),
    children: item.children.map(convertArticleListItem),
  }
  if (typeof item.checked === 'boolean') result.checked = item.checked
  return result
}

function convertArticleBlock(block: ArticleBlock): MdBlock {
  switch (block.$type) {
    case 'header':
      return { $type: 'heading', level: block.level, segments: block.segments.map(convertArticleSegment) }
    case 'text':
      return { $type: 'paragraph', segments: block.segments.map(convertArticleSegment) }
    case 'blockquote':
      return { $type: 'blockquote', segments: block.segments.map(convertArticleSegment) }
    case 'code':
      return { $type: 'code', text: block.text, ...(block.language ? { language: block.language } : {}) }
    case 'horizontalRule':
      return { $type: 'horizontalRule' }
    case 'unorderedList':
      return { $type: 'unorderedList', items: block.items.map(convertArticleListItem) }
    case 'orderedList': {
      const result: MdBlock = { $type: 'orderedList', items: block.items.map(convertArticleListItem) }
      if (typeof block.startIndex === 'number') (result as { $type: 'orderedList'; startIndex?: number; items: MdListItem[] }).startIndex = block.startIndex
      return result
    }
    case 'math':
      return { $type: 'math', tex: block.tex }
  }
}

export function articleToMdDocument(article: Article): MdDocument {
  return {
    title: article.title,
    description: article.description,
    tags: article.tags,
    publicationUri: article.site,
    blocks: article.blocks.map(convertArticleBlock),
  }
}

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
