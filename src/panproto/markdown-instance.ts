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

export type MdTableCell = {
  plaintext: string
}

export type MdTableAlignment = 'left' | 'center' | 'right' | null

export type MdTableRow = {
  header?: boolean
  cells: MdTableCell[]
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
  | { $type: 'table'; rows: MdTableRow[]; alignments?: MdTableAlignment[] }

export type MdDocument = {
  title: string
  description: string
  tags: string[]
  publicationUri: string
  blocks: MdBlock[]
}

const DISPLAY_MATH_RE = /^\s*\$\$\s*([\s\S]+?)\s*\$\$\s*$/
const INLINE_MATH_RE = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g

type ProtectedInlineMath = {
  text: string
  restores: Map<string, string>
}

function protectInlineMath(text: string): ProtectedInlineMath {
  const restores = new Map<string, string>()
  let index = 0
  const protectedText = text.replace(INLINE_MATH_RE, (match) => {
    const key = `@@INLINE_MATH_${index++}@@`
    restores.set(key, match)
    return key
  })
  return { text: protectedText, restores }
}

function restoreInlineMathSegments(segments: Segment[], restores: Map<string, string>): Segment[] {
  if (restores.size === 0) return segments

  const restored: Segment[] = []
  for (const segment of segments) {
    const exact = restores.get(segment.text)
    if (exact) {
      restored.push({ text: exact })
      continue
    }

    let cursor = 0
    const matches = [...restores.entries()]
      .map(([key, value]) => ({ key, value, index: segment.text.indexOf(key) }))
      .filter((match) => match.index >= 0)
      .sort((a, b) => a.index - b.index)

    if (matches.length === 0) {
      restored.push(segment)
      continue
    }

    for (const match of matches) {
      if (match.index > cursor) {
        restored.push({ ...segment, text: segment.text.slice(cursor, match.index) })
      }
      restored.push({ text: match.value })
      cursor = match.index + match.key.length
    }

    if (cursor < segment.text.length) {
      restored.push({ ...segment, text: segment.text.slice(cursor) })
    }
  }

  return restored
}

function parseInlineSegments(fallbackText: string): Segment[] {
  const { text, restores } = protectInlineMath(fallbackText)
  const protectedTokens = Lexer.lexInline(text) as InlineNode[]
  return restoreInlineMathSegments(flattenInline(protectedTokens), restores)
}

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
    return parseInlineSegments(first.text)
  }
  if (first?.type === 'heading') {
    return parseInlineSegments((first as Tokens.Heading).text)
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
          segments: parseInlineSegments((token as Tokens.Heading).text),
        })
        break
      case 'paragraph': {
        const mathBlock = extractDisplayMath(token as Tokens.Paragraph)
        if (mathBlock) {
          blocks.push(mathBlock)
        } else {
          blocks.push({
            $type: 'paragraph',
            segments: parseInlineSegments((token as Tokens.Paragraph).text),
          })
        }
        break
      }
      case 'blockquote':
        {
          const paragraphs = (token as Tokens.Blockquote).tokens.filter((item): item is Tokens.Paragraph => item.type === 'paragraph')
          const text = paragraphs.map((item) => item.text).join('\n')
        blocks.push({
          $type: 'blockquote',
          segments: parseInlineSegments(text),
        })
        break
        }
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
      case 'table': {
        const tbl = token as Tokens.Table
        const alignments: MdTableAlignment[] = tbl.align ?? []
        const rows: MdTableRow[] = []
        rows.push({
          header: true,
          cells: tbl.header.map((c) => ({ plaintext: c.text })),
        })
        for (const row of tbl.rows) {
          rows.push({
            cells: row.map((c) => ({ plaintext: c.text })),
          })
        }
        blocks.push({ $type: 'table', rows, ...(alignments.length > 0 ? { alignments } : {}) })
        break
      }
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
    case 'table': {
      const alignments = block.alignments ?? []
      const headerRow = block.rows.find((r) => r.header) ?? block.rows[0]
      const bodyRows = block.rows.filter((r) => r !== headerRow)
      const colCount = headerRow?.cells.length ?? 0

      const delimiter = alignments.length > 0
        ? alignments.slice(0, colCount).map((a) => {
            if (a === 'center') return ':---:'
            if (a === 'right') return '---:'
            if (a === 'left') return ':---'
            return '---'
          }).join(' | ')
        : Array.from({ length: colCount }, () => '---').join(' | ')

      const lines: string[] = []
      if (headerRow) {
        lines.push('| ' + headerRow.cells.map((c) => escapePipe(c.plaintext)).join(' | ') + ' |')
      }
      lines.push('| ' + delimiter + ' |')
      for (const row of bodyRows) {
        const cells = row.cells.map((c) => escapePipe(c.plaintext))
        while (cells.length < colCount) cells.push('')
        lines.push('| ' + cells.join(' | ') + ' |')
      }
      return lines.join('\n')
    }
  }
}

function emitSegments(segments: Segment[]): string {
  return segments.map(emitSegment).join('')
}

function escapePipe(text: string): string {
  return text.replace(/\|/g, '\\|')
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
