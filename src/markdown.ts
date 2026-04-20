import { Lexer, type Tokens } from 'marked'

import type {
  BlockquoteBlock,
  CodeBlock,
  ConversionResult,
  FacetFeature,
  HeaderBlock,
  HorizontalRuleBlock,
  LeafletFacet,
  MathBlock,
  OrderedListBlock,
  OrderedListItem,
  TextBlock,
  UnorderedListBlock,
  UnorderedListItem,
} from './types'

import type { EditorDraft } from './types'

type InlineNode = Tokens.Generic | Tokens.Link | Tokens.Strong | Tokens.Em | Tokens.Codespan | Tokens.Del | Tokens.Text

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

function createFacet(byteStart: number, byteEnd: number, feature: FacetFeature): LeafletFacet {
  return {
    $type: 'pub.leaflet.richtext.facet',
    index: { byteStart, byteEnd },
    features: [feature],
  }
}

function flattenInline(tokens: InlineNode[] | undefined): { text: string; facets: LeafletFacet[] } {
  if (!tokens || tokens.length === 0) {
    return { text: '', facets: [] }
  }

  let text = ''
  const facets: LeafletFacet[] = []

  const appendTokens = (items: InlineNode[] | undefined, wrappers: FacetFeature[] = []) => {
    for (const token of items ?? []) {
      if (token.type === 'text') {
        const start = byteLength(text)
        text += token.text
        const end = byteLength(text)
        for (const feature of wrappers) {
          facets.push(createFacet(start, end, feature))
        }
        continue
      }

      if (token.type === 'link') {
        const start = byteLength(text)
        appendTokens((token.tokens as InlineNode[] | undefined) ?? [{ type: 'text', raw: token.text, text: token.text } as Tokens.Text], wrappers)
        const end = byteLength(text)
        facets.push(createFacet(start, end, { $type: 'pub.leaflet.richtext.facet#link', uri: token.href }))
        continue
      }

      if (token.type === 'strong') {
        appendTokens(token.tokens as InlineNode[] | undefined, [
          ...wrappers,
          { $type: 'pub.leaflet.richtext.facet#bold' },
        ])
        continue
      }

      if (token.type === 'em') {
        appendTokens(token.tokens as InlineNode[] | undefined, [
          ...wrappers,
          { $type: 'pub.leaflet.richtext.facet#italic' },
        ])
        continue
      }

      if (token.type === 'codespan') {
        const start = byteLength(text)
        text += token.text
        const end = byteLength(text)
        facets.push(createFacet(start, end, { $type: 'pub.leaflet.richtext.facet#code' }))
        for (const feature of wrappers) {
          facets.push(createFacet(start, end, feature))
        }
        continue
      }

      if (token.type === 'del') {
        appendTokens(token.tokens as InlineNode[] | undefined, [
          ...wrappers,
          { $type: 'pub.leaflet.richtext.facet#strikethrough' },
        ])
        continue
      }

      if ('raw' in token && typeof token.raw === 'string') {
        const start = byteLength(text)
        text += token.raw
        const end = byteLength(text)
        for (const feature of wrappers) {
          facets.push(createFacet(start, end, feature))
        }
      }
    }
  }

  appendTokens(tokens)
  return { text, facets }
}

function makeTextBlock(tokens: InlineNode[] | undefined): TextBlock {
  const { text, facets } = flattenInline(tokens)
  return {
    $type: 'pub.leaflet.blocks.text',
    plaintext: text,
    ...(facets.length > 0 ? { facets } : {}),
  }
}

function makeHeaderBlock(token: Tokens.Heading): HeaderBlock {
  const { text, facets } = flattenInline(token.tokens as InlineNode[] | undefined)
  return {
    $type: 'pub.leaflet.blocks.header',
    level: token.depth,
    plaintext: text,
    ...(facets.length > 0 ? { facets } : {}),
  }
}

function makeBlockquoteBlock(token: Tokens.Blockquote): BlockquoteBlock {
  const nested = token.tokens
    .filter((item): item is Tokens.Paragraph => item.type === 'paragraph')
    .flatMap((item) => item.tokens as InlineNode[])

  const { text, facets } = flattenInline(nested)
  return {
    $type: 'pub.leaflet.blocks.blockquote',
    plaintext: text,
    ...(facets.length > 0 ? { facets } : {}),
  }
}

function listItemContent(item: Tokens.ListItem) {
  const first = item.tokens[0]
  if (first?.type === 'text') {
    return makeTextBlock(first.tokens as InlineNode[] | undefined)
  }

  if (first?.type === 'paragraph') {
    return makeTextBlock(first.tokens as InlineNode[] | undefined)
  }

  if (first?.type === 'heading') {
    return makeHeaderBlock(first as Tokens.Heading)
  }

  return {
    $type: 'pub.leaflet.blocks.text',
    plaintext: item.text,
  } satisfies TextBlock
}

function makeUnorderedItem(item: Tokens.ListItem): UnorderedListItem {
  return {
    $type: 'pub.leaflet.blocks.unorderedList#listItem',
    content: listItemContent(item),
    ...(typeof item.checked === 'boolean' ? { checked: item.checked } : {}),
  }
}

function makeOrderedItem(item: Tokens.ListItem): OrderedListItem {
  return {
    $type: 'pub.leaflet.blocks.orderedList#listItem',
    content: listItemContent(item),
    ...(typeof item.checked === 'boolean' ? { checked: item.checked } : {}),
  }
}

const DISPLAY_MATH_RE = /^\s*\$\$\s*([\s\S]+?)\s*\$\$\s*$/

function extractDisplayMath(token: Tokens.Paragraph): MathBlock | null {
  const text = token.text.trim()
  const match = DISPLAY_MATH_RE.exec(text)
  if (!match) return null
  return {
    $type: 'pub.leaflet.blocks.math',
    tex: match[1].trim(),
  }
}

export function convertMarkdownToLeaflet(draft: EditorDraft): ConversionResult {
  const warnings: string[] = []
  const tokens = Lexer.lex(draft.markdown)
  const blocks: Array<
    | TextBlock
    | HeaderBlock
    | BlockquoteBlock
    | CodeBlock
    | HorizontalRuleBlock
    | UnorderedListBlock
    | OrderedListBlock
    | MathBlock
  > = []

  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        blocks.push(makeHeaderBlock(token as Tokens.Heading))
        break
      case 'paragraph': {
        const mathBlock = extractDisplayMath(token as Tokens.Paragraph)
        if (mathBlock) {
          blocks.push(mathBlock)
        } else {
          blocks.push(makeTextBlock((token as Tokens.Paragraph).tokens as InlineNode[] | undefined))
        }
        break
      }
      case 'blockquote':
        blocks.push(makeBlockquoteBlock(token as Tokens.Blockquote))
        break
      case 'code':
        blocks.push({
          $type: 'pub.leaflet.blocks.code',
          plaintext: token.text,
          ...(token.lang ? { language: token.lang } : {}),
        })
        break
      case 'hr':
        blocks.push({ $type: 'pub.leaflet.blocks.horizontalRule' })
        break
      case 'list':
        if (token.ordered) {
          blocks.push({
            $type: 'pub.leaflet.blocks.orderedList',
            ...(typeof token.start === 'number' ? { startIndex: token.start } : {}),
            children: token.items.map(makeOrderedItem),
          })
        } else {
          blocks.push({
            $type: 'pub.leaflet.blocks.unorderedList',
            children: token.items.map(makeUnorderedItem),
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
    pages: [
      {
        $type: 'pub.leaflet.pages.linearDocument',
        id: crypto.randomUUID(),
        blocks: blocks.map((block) => ({
          $type: 'pub.leaflet.pages.linearDocument#block' as const,
          block,
        })),
      },
    ],
    warnings,
  }
}
