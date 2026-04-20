import type {
  DocumentImportResult,
  LeafletBlock,
  LeafletFacet,
  LinearDocumentBlock,
  LinearDocumentPage,
  SiteStandardDocumentRecord,
} from './types'

function byteToCharMap(text: string): number[] {
  const map: number[] = []
  let charPos = 0
  for (const char of text) {
    const bytes = new TextEncoder().encode(char).length
    for (let i = 0; i < bytes; i++) {
      map.push(charPos)
    }
    charPos++
  }
  map.push(charPos)
  return map
}

type Annotation = {
  charStart: number
  charEnd: number
  kind: 'bold' | 'italic' | 'code' | 'strikethrough' | 'link'
  uri?: string
}

function facetsToMarkdown(plaintext: string, facets: LeafletFacet[] | undefined): string {
  if (!facets || facets.length === 0 || plaintext.length === 0) return plaintext

  const b2c = byteToCharMap(plaintext)
  const maxByte = b2c.length - 1

  const annotations: Annotation[] = []
  for (const facet of facets) {
    const bs = Math.min(facet.index.byteStart, maxByte)
    const be = Math.min(facet.index.byteEnd, maxByte)
    const charStart = b2c[bs] ?? plaintext.length
    const charEnd = b2c[be] ?? plaintext.length

    for (const feature of facet.features) {
      const t = feature.$type
      if (t === 'pub.leaflet.richtext.facet#bold') {
        annotations.push({ charStart, charEnd, kind: 'bold' })
      } else if (t === 'pub.leaflet.richtext.facet#italic') {
        annotations.push({ charStart, charEnd, kind: 'italic' })
      } else if (t === 'pub.leaflet.richtext.facet#code') {
        annotations.push({ charStart, charEnd, kind: 'code' })
      } else if (t === 'pub.leaflet.richtext.facet#strikethrough') {
        annotations.push({ charStart, charEnd, kind: 'strikethrough' })
      } else if (t === 'pub.leaflet.richtext.facet#link' && 'uri' in feature) {
        annotations.push({ charStart, charEnd, kind: 'link', uri: feature.uri as string })
      }
    }
  }

  if (annotations.length === 0) return plaintext

  annotations.sort((a, b) => a.charStart - b.charStart || b.charEnd - a.charEnd)

  const hasOverlap = annotations.some((a, i) =>
    i > 0 && a.charStart < annotations[i - 1].charEnd
  )

  const filtered = hasOverlap
    ? annotations.filter(a => a.kind === 'link' || a.kind === 'code')
    : annotations

  if (filtered.length === 0) return plaintext

  const openAt = new Map<number, Annotation[]>()
  const closeAt = new Map<number, Annotation[]>()
  for (const a of filtered) {
    ;(openAt.get(a.charStart) ?? openAt.set(a.charStart, []).get(a.charStart)!).push(a)
    ;(closeAt.get(a.charEnd) ?? closeAt.set(a.charEnd, []).get(a.charEnd)!).push(a)
  }

  let result = ''
  for (let i = 0; i < plaintext.length; i++) {
    const opens = openAt.get(i)
    if (opens) {
      for (const a of opens) result += openMarker(a)
    }

    result += plaintext[i]

    const closes = closeAt.get(i + 1)
    if (closes) {
      for (const a of closes.slice().reverse()) result += closeMarker(a)
    }
  }

  const trailing = closeAt.get(plaintext.length)
  if (trailing) {
    for (const a of trailing.slice().reverse()) result += closeMarker(a)
  }

  return result
}

function openMarker(a: Annotation): string {
  switch (a.kind) {
    case 'bold': return '**'
    case 'italic': return '_'
    case 'code': return '`'
    case 'strikethrough': return '~~'
    case 'link': return '['
  }
}

function closeMarker(a: Annotation): string {
  switch (a.kind) {
    case 'bold': return '**'
    case 'italic': return '_'
    case 'code': return '`'
    case 'strikethrough': return '~~'
    case 'link': return a.uri ? `](${a.uri})` : ']'
  }
}

function blockToMarkdown(block: LeafletBlock, warnings: string[]): string {
  const t = block.$type

  if (t === 'pub.leaflet.blocks.text') {
    const b = block as { plaintext: string; facets?: LeafletFacet[] }
    return facetsToMarkdown(b.plaintext, b.facets)
  }

  if (t === 'pub.leaflet.blocks.header') {
    const b = block as { level: number; plaintext: string; facets?: LeafletFacet[] }
    const prefix = '#'.repeat(Math.min(Math.max(b.level, 1), 6))
    return `${prefix} ${facetsToMarkdown(b.plaintext, b.facets)}`
  }

  if (t === 'pub.leaflet.blocks.blockquote') {
    const b = block as { plaintext: string; facets?: LeafletFacet[] }
    const text = facetsToMarkdown(b.plaintext, b.facets)
    return text.split('\n').map((line: string) => `> ${line}`).join('\n')
  }

  if (t === 'pub.leaflet.blocks.code') {
    const b = block as { plaintext: string; language?: string }
    const lang = b.language ?? ''
    return `\`\`\`${lang}\n${b.plaintext}\n\`\`\``
  }

  if (t === 'pub.leaflet.blocks.horizontalRule') {
    return '---'
  }

  if (t === 'pub.leaflet.blocks.math') {
    const b = block as { tex: string }
    return `$$\n${b.tex}\n$$`
  }

  if (t === 'pub.leaflet.blocks.unorderedList') {
    const b = block as { children: ListItemShape[] }
    return listItemsToMarkdown(b.children, '-', warnings)
  }

  if (t === 'pub.leaflet.blocks.orderedList') {
    const b = block as { startIndex?: number; children: ListItemShape[] }
    const start = b.startIndex ?? 1
    return listItemsToMarkdown(b.children, `${start}.`, warnings)
  }

  warnings.push(`Unsupported block type skipped: ${t}`)
  return ''
}

type ListItemShape = {
  content: { $type: string; plaintext: string; facets?: LeafletFacet[] }
  checked?: boolean
  children?: ListItemShape[]
}

function listItemsToMarkdown(
  items: ListItemShape[],
  marker: string,
  warnings: string[],
  indent: string = '',
): string {
  const lines: string[] = []
  let counter = marker.endsWith('.') ? parseInt(marker) : 0

  for (const item of items) {
    const ct = item.content
    let text = facetsToMarkdown(ct.plaintext, ct.facets)
    if (typeof item.checked === 'boolean') {
      text = `[${item.checked ? 'x' : ' '}] ${text}`
    }

    const prefix = counter > 0 ? `${counter}. ` : `${marker} `
    lines.push(`${indent}${prefix}${text}`)

    if (Array.isArray(item.children) && item.children.length > 0) {
      const nested = listItemsToMarkdown(item.children, '-', warnings, indent + '  ')
      if (nested) lines.push(nested)
    }

    if (counter > 0) counter++
  }

  return lines.join('\n')
}

function pageToMarkdown(page: LinearDocumentPage, warnings: string[]): string {
  return page.blocks
    .map((b: LinearDocumentBlock) => {
      if (!b.block) {
        warnings.push('Empty block wrapper skipped')
        return ''
      }
      return blockToMarkdown(b.block, warnings)
    })
    .filter(Boolean)
    .join('\n\n')
}

export function importDocument(record: SiteStandardDocumentRecord): DocumentImportResult {
  const warnings: string[] = []
  const content = record.content

  if (!content || content.$type !== 'pub.leaflet.content') {
    warnings.push('Record has no pub.leaflet.content — cannot import')
    return emptyResult(record, warnings)
  }

  const pages = content.pages ?? []
  if (pages.length === 0) {
    warnings.push('Document has no pages')
    return emptyResult(record, warnings)
  }

  const markdownParts: string[] = []
  let importedFirst = false

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as { $type?: string }
    if (page.$type === 'pub.leaflet.pages.linearDocument') {
      const md = pageToMarkdown(page as LinearDocumentPage, warnings)
      if (md) {
        if (importedFirst) markdownParts.push('\n---\n')
        markdownParts.push(md)
        importedFirst = true
      }
    } else if (page.$type === 'pub.leaflet.pages.canvas') {
      warnings.push(`Canvas page ${i + 1} skipped — not supported in this editor`)
    } else {
      warnings.push(`Unknown page type at index ${i + 1} skipped: ${page.$type ?? 'unknown'}`)
    }
  }

  let publicationUri = ''
  if (typeof record.site === 'string' && record.site.startsWith('at://')) {
    const parts = record.site.split('/')
    if (parts[3] === 'site.standard.publication') {
      publicationUri = record.site
    }
  }

  return {
    markdown: markdownParts.join(''),
    title: record.title ?? '',
    description: typeof record.description === 'string' ? record.description : '',
    tags: Array.isArray(record.tags) ? record.tags.filter((t): t is string => typeof t === 'string').join(', ') : '',
    publicationUri,
    warnings,
  }
}

function emptyResult(record: SiteStandardDocumentRecord, warnings: string[]): DocumentImportResult {
  return {
    markdown: '',
    title: record.title ?? '',
    description: typeof record.description === 'string' ? record.description : '',
    tags: Array.isArray(record.tags) ? record.tags.filter((t): t is string => typeof t === 'string').join(', ') : '',
    publicationUri: '',
    warnings,
  }
}
