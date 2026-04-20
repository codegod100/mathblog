import { Lexer, type Tokens } from 'marked'

import type { EditorDraft } from '../types'

type InlineNode = Tokens.Generic | Tokens.Link | Tokens.Strong | Tokens.Em | Tokens.Codespan | Tokens.Del | Tokens.Text

export type Segment = {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strikethrough?: boolean
  linkUri?: string
}

export type MdListItem = {
  segments: Segment[]
  checked?: boolean
  children: MdListItem[]
}

export type MdBlock =
  | { $type: 'heading'; level: number; segments: Segment[] }
  | { $type: 'paragraph'; segments: Segment[] }
  | { $type: 'blockquote'; segments: Segment[] }
  | { $type: 'code'; text: string; language?: string }
  | { $type: 'horizontalRule' }
  | { $type: 'unorderedList'; items: MdListItem[] }
  | { $type: 'orderedList'; startIndex?: number; items: MdListItem[] }
  | { $type: 'math'; tex: string }

export type MdDocument = {
  title: string
  description: string
  tags: string[]
  publicationUri: string
  blocks: MdBlock[]
}

const DISPLAY_MATH_RE = /^\s*\$\$\s*([\s\S]+?)\s*\$\$\s*$/

function flattenInline(tokens: InlineNode[] | undefined, wrappers: Partial<Pick<Segment, 'bold' | 'italic' | 'strikethrough' | 'code'>> = {}): Segment[] {
  if (!tokens || tokens.length === 0) return []

  const segments: Segment[] = []

  for (const token of tokens) {
    if (token.type === 'text') {
      segments.push({ text: token.text, ...wrappers })
      continue
    }

    if (token.type === 'codespan') {
      segments.push({ text: token.text, ...wrappers, code: true })
      continue
    }

    if (token.type === 'link') {
      const inner = flattenInline(
        (token.tokens as InlineNode[] | undefined) ?? [{ type: 'text', raw: token.text, text: token.text } as Tokens.Text],
        wrappers,
      )
      for (const seg of inner) {
        segments.push({ ...seg, linkUri: token.href })
      }
      continue
    }

    if (token.type === 'strong') {
      segments.push(...flattenInline(token.tokens as InlineNode[] | undefined, { ...wrappers, bold: true }))
      continue
    }

    if (token.type === 'em') {
      segments.push(...flattenInline(token.tokens as InlineNode[] | undefined, { ...wrappers, italic: true }))
      continue
    }

    if (token.type === 'del') {
      segments.push(...flattenInline(token.tokens as InlineNode[] | undefined, { ...wrappers, strikethrough: true }))
      continue
    }

    if ('raw' in token && typeof token.raw === 'string') {
      segments.push({ text: token.raw, ...wrappers })
    }
  }

  return segments
}

function listItemContent(item: Tokens.ListItem): Segment[] {
  const first = item.tokens[0]
  if (first?.type === 'text' || first?.type === 'paragraph') {
    return flattenInline(first.tokens as InlineNode[] | undefined)
  }
  if (first?.type === 'heading') {
    return flattenInline((first as Tokens.Heading).tokens as InlineNode[] | undefined)
  }
  return [{ text: item.text }]
}

function makeListItem(item: Tokens.ListItem): MdListItem {
  return {
    segments: listItemContent(item),
    ...(typeof item.checked === 'boolean' ? { checked: item.checked } : {}),
    children: (item.tokens ?? [])
      .filter((t): t is Tokens.List => t.type === 'list')
      .flatMap((t) => t.items.map(makeListItem)),
  }
}

function extractDisplayMath(token: Tokens.Paragraph): MdBlock | null {
  const text = token.text.trim()
  const match = DISPLAY_MATH_RE.exec(text)
  if (!match) return null
  return { $type: 'math', tex: match[1].trim() }
}

export function parseMarkdownToMdDocument(draft: EditorDraft): MdDocument & { warnings: string[] } {
  const warnings: string[] = []
  const tokens = Lexer.lex(draft.markdown)
  const blocks: MdBlock[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        blocks.push({
          $type: 'heading',
          level: (token as Tokens.Heading).depth,
          segments: flattenInline((token as Tokens.Heading).tokens as InlineNode[] | undefined),
        })
        break
      case 'paragraph': {
        const mathBlock = extractDisplayMath(token as Tokens.Paragraph)
        if (mathBlock) {
          blocks.push(mathBlock)
        } else {
          blocks.push({
            $type: 'paragraph',
            segments: flattenInline((token as Tokens.Paragraph).tokens as InlineNode[] | undefined),
          })
        }
        break
      }
      case 'blockquote':
        blocks.push({
          $type: 'blockquote',
          segments: flattenInline(
            (token as Tokens.Blockquote).tokens
              .filter((item): item is Tokens.Paragraph => item.type === 'paragraph')
              .flatMap((item) => item.tokens as InlineNode[]),
          ),
        })
        break
      case 'code':
        blocks.push({
          $type: 'code',
          text: token.text,
          ...(token.lang ? { language: token.lang } : {}),
        })
        break
      case 'hr':
        blocks.push({ $type: 'horizontalRule' })
        break
      case 'list':
        if (token.ordered) {
          blocks.push({
            $type: 'orderedList',
            ...(typeof token.start === 'number' ? { startIndex: token.start } : {}),
            items: token.items.map(makeListItem),
          })
        } else {
          blocks.push({
            $type: 'unorderedList',
            items: token.items.map(makeListItem),
          })
        }
        break
      case 'space':
        break
      default:
        warnings.push(`Unsupported markdown token skipped: ${token.type}`)
        break
    }
  }

  return {
    title: draft.title,
    description: draft.description,
    tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
    publicationUri: draft.publicationUri,
    blocks,
    warnings,
  }
}

export function emitMarkdownFromMdDocument(doc: MdDocument): string {
  const parts: string[] = []

  for (const block of doc.blocks) {
    parts.push(emitBlock(block))
  }

  return parts.join('\n\n')
}

function emitBlock(block: MdBlock): string {
  switch (block.$type) {
    case 'heading': {
      const prefix = '#'.repeat(Math.min(Math.max(block.level, 1), 6))
      return `${prefix} ${emitSegments(block.segments)}`
    }
    case 'paragraph':
      return emitSegments(block.segments)
    case 'blockquote': {
      const text = emitSegments(block.segments)
      return text.split('\n').map((line: string) => `> ${line}`).join('\n')
    }
    case 'code': {
      const lang = block.language ?? ''
      return `\`\`\`${lang}\n${block.text}\n\`\`\``
    }
    case 'horizontalRule':
      return '---'
    case 'unorderedList':
      return emitListItems(block.items, '-')
    case 'orderedList': {
      const start = block.startIndex ?? 1
      return emitListItems(block.items, `${start}.`)
    }
    case 'math':
      return `$$\n${block.tex}\n$$`
  }
}

function emitSegments(segments: Segment[]): string {
  return segments.map(emitSegment).join('')
}

function emitSegment(seg: Segment): string {
  let text = seg.text
  if (seg.code) return `\`${text}\``
  if (seg.linkUri) return `[${text}](${seg.linkUri})`
  if (seg.bold && seg.italic) return `***${text}***`
  if (seg.bold) return `**${text}**`
  if (seg.italic) return `*${text}*`
  if (seg.strikethrough) return `~~${text}~~`
  return text
}

function emitListItems(items: MdListItem[], marker: string, indent: string = ''): string {
  const lines: string[] = []
  let counter = marker.endsWith('.') ? parseInt(marker) : 0

  for (const item of items) {
    let text = emitSegments(item.segments)
    if (typeof item.checked === 'boolean') {
      text = `[${item.checked ? 'x' : ' '}] ${text}`
    }

    const prefix = counter > 0 ? `${counter}. ` : `${marker} `
    lines.push(`${indent}${prefix}${text}`)

    if (item.children.length > 0) {
      lines.push(emitListItems(item.children, '-', indent + '  '))
    }

    if (counter > 0) counter++
  }

  return lines.join('\n')
}
