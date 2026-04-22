import type {
	BlockquoteBlock,
	CodeBlock,
	FacetFeature,
	HeaderBlock,
	HorizontalRuleBlock,
	LeafletFacet,
	LeafletBlock,
	LinearDocumentBlock,
	LinearDocumentPage,
	MathBlock,
	OrderedListBlock,
	OrderedListItem,
	SiteStandardDocumentRecord,
	TextBlock,
	UnorderedListBlock,
	UnorderedListItem,
} from '../atproto/types'
import { parseKatexGridTex, tableToKatexGridTex } from '../table-katex'

import { texToUnicode } from '../latex-to-unicode'

import type { Article, ArticleBlock, ArticleListItem, ArticleSegment } from './lens-a'

function byteLength(value: string): number {
	return new TextEncoder().encode(value).length
}

function convertInlineMathInSegments(segments: ArticleSegment[]): ArticleSegment[] {
	const INLINE_MATH_RE = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g
	return segments.map(seg => ({
		...seg,
		text: seg.text.replace(INLINE_MATH_RE, (_, expr: string) => texToUnicode(expr)),
	}))
}

function filterAndAdjustFacets(facets: LeafletFacet[] | undefined, segByteStart: number, segByteEnd: number): LeafletFacet[] | undefined {
	if (!facets || facets.length === 0) return undefined
	const filtered = facets.filter(f => f.index.byteStart >= segByteStart && f.index.byteEnd <= segByteEnd)
	if (filtered.length === 0) return undefined
	return filtered.map(f => ({
		...f,
		index: { byteStart: f.index.byteStart - segByteStart, byteEnd: f.index.byteEnd - segByteStart }
	}))
}

function splitTextBlockIntoArticleBlocks(plaintext: string, facets: LeafletFacet[] | undefined): ArticleBlock[] {
	const blocks: ArticleBlock[] = []
	const regex = /\$\$([\s\S]+?)\$\$/g
	let lastIndex = 0
	let match: RegExpExecArray | null

	while ((match = regex.exec(plaintext)) !== null) {
		const beforeText = plaintext.slice(lastIndex, match.index)
		if (beforeText) {
			const beforeFacets = filterAndAdjustFacets(facets, lastIndex, match.index)
			blocks.push({
				$type: 'text',
				segments: convertInlineMathInSegments(plaintextAndFacetsToSegments(beforeText, beforeFacets)),
			})
		}
		blocks.push({ $type: 'math', tex: match[1].trim() })
		lastIndex = regex.lastIndex
	}

	const afterText = plaintext.slice(lastIndex)
	if (afterText) {
		const afterFacets = filterAndAdjustFacets(facets, lastIndex, plaintext.length)
		blocks.push({
			$type: 'text',
			segments: convertInlineMathInSegments(plaintextAndFacetsToSegments(afterText, afterFacets)),
		})
	}

	return blocks.length > 0 ? blocks : [{
		$type: 'text',
		segments: convertInlineMathInSegments(plaintextAndFacetsToSegments(plaintext, facets)),
	}]
}

function makeFacet(byteStart: number, byteEnd: number, feature: FacetFeature): LeafletFacet {
	return {
		$type: 'pub.leaflet.richtext.facet',
		index: { byteStart, byteEnd },
		features: [feature],
	}
}

function segmentsToPlaintextAndFacets(segments: ArticleSegment[]): { plaintext: string; facets: LeafletFacet[] } {
	let plaintext = ''
	const facets: LeafletFacet[] = []

	for (const seg of segments) {
		const start = byteLength(plaintext)
		plaintext += seg.text
		const end = byteLength(plaintext)

		if (seg.bold) facets.push(makeFacet(start, end, { $type: 'pub.leaflet.richtext.facet#bold' }))
		if (seg.italic) facets.push(makeFacet(start, end, { $type: 'pub.leaflet.richtext.facet#italic' }))
		if (seg.code) facets.push(makeFacet(start, end, { $type: 'pub.leaflet.richtext.facet#code' }))
		if (seg.strikethrough) facets.push(makeFacet(start, end, { $type: 'pub.leaflet.richtext.facet#strikethrough' }))
		if (seg.linkUri) facets.push(makeFacet(start, end, { $type: 'pub.leaflet.richtext.facet#link', uri: seg.linkUri }))
	}

	return { plaintext, facets }
}

function makeTextBlockFromSegments(segments: ArticleSegment[]): TextBlock {
	const { plaintext, facets } = segmentsToPlaintextAndFacets(segments)
	return {
		$type: 'pub.leaflet.blocks.text',
		plaintext,
		...(facets.length > 0 ? { facets } : {}),
	}
}

function convertListItemToUnordered(item: ArticleListItem): UnorderedListItem {
	const result: UnorderedListItem = {
		$type: 'pub.leaflet.blocks.unorderedList#listItem',
		content: makeTextBlockFromSegments(item.segments),
	}
	if (typeof item.checked === 'boolean') result.checked = item.checked
	if (item.children.length > 0) result.children = item.children.map(convertListItemToUnordered)
	return result
}

function convertListItemToOrdered(item: ArticleListItem): OrderedListItem {
	const result: OrderedListItem = {
		$type: 'pub.leaflet.blocks.orderedList#listItem',
		content: makeTextBlockFromSegments(item.segments),
	}
	if (typeof item.checked === 'boolean') result.checked = item.checked
	if (item.children.length > 0) result.children = item.children.map(convertListItemToOrdered)
	return result
}

function convertBlock(block: ArticleBlock): LeafletBlock {
	switch (block.$type) {
		case 'header': {
			const { plaintext, facets } = segmentsToPlaintextAndFacets(block.segments)
			return {
				$type: 'pub.leaflet.blocks.header',
				level: block.level,
				plaintext,
				...(facets.length > 0 ? { facets } : {}),
			} satisfies HeaderBlock
		}
		case 'text':
			return makeTextBlockFromSegments(block.segments)
		case 'blockquote': {
			const { plaintext, facets } = segmentsToPlaintextAndFacets(block.segments)
			return {
				$type: 'pub.leaflet.blocks.blockquote',
				plaintext,
				...(facets.length > 0 ? { facets } : {}),
			} satisfies BlockquoteBlock
		}
		case 'code':
			return {
				$type: 'pub.leaflet.blocks.code',
				plaintext: block.text,
				...(block.language ? { language: block.language } : {}),
			} satisfies CodeBlock
		case 'horizontalRule':
			return { $type: 'pub.leaflet.blocks.horizontalRule' } satisfies HorizontalRuleBlock
		case 'unorderedList':
			return {
				$type: 'pub.leaflet.blocks.unorderedList',
				children: block.items.map(convertListItemToUnordered),
			} satisfies UnorderedListBlock
		case 'orderedList': {
			const result: OrderedListBlock = {
				$type: 'pub.leaflet.blocks.orderedList',
				children: block.items.map(convertListItemToOrdered),
			}
			if (typeof block.startIndex === 'number') result.startIndex = block.startIndex
			return result
		}
		case 'math':
			return { $type: 'pub.leaflet.blocks.math', tex: block.tex } satisfies MathBlock
		case 'table':
			return {
				$type: 'pub.leaflet.blocks.math',
				tex: tableToKatexGridTex(block.rows, block.alignments),
			} satisfies MathBlock
	}
}

export type ArticleToLexiconOptions = {
	site: string
	publishedAt: string
	path: string
}

export function articleToLexicon(article: Article, opts: ArticleToLexiconOptions): SiteStandardDocumentRecord {
	const blocks: LinearDocumentBlock[] = article.blocks.map((block) => ({
		$type: 'pub.leaflet.pages.linearDocument#block',
		block: convertBlock(block),
	}))

	const page: LinearDocumentPage = {
		$type: 'pub.leaflet.pages.linearDocument',
		id: crypto.randomUUID(),
		blocks,
	}

	const record: SiteStandardDocumentRecord = {
		$type: 'site.standard.document',
		site: opts.site,
		title: article.title || 'Untitled leaflet',
		publishedAt: opts.publishedAt,
		path: opts.path,
		content: {
			$type: 'pub.leaflet.content',
			pages: [page],
		},
		updatedAt: opts.publishedAt,
	}

	if (article.description) record.description = article.description
	if (article.tags.length > 0) record.tags = article.tags

	return record
}

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

function plaintextAndFacetsToSegments(plaintext: string, facets: LeafletFacet[] | undefined): ArticleSegment[] {
	if (!facets || facets.length === 0 || plaintext.length === 0) {
		return [{ text: plaintext }]
	}

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

	if (annotations.length === 0) return [{ text: plaintext }]

	annotations.sort((a, b) => a.charStart - b.charStart || b.charEnd - a.charEnd)

	const hasOverlap = annotations.some((a, i) =>
		i > 0 && a.charStart < annotations[i - 1].charEnd,
	)
	const filtered = hasOverlap
		? annotations.filter(a => a.kind === 'link' || a.kind === 'code')
		: annotations

	if (filtered.length === 0) return [{ text: plaintext }]

	const boundaries = new Set<number>()
	boundaries.add(0)
	boundaries.add(plaintext.length)
	for (const a of filtered) {
		boundaries.add(a.charStart)
		boundaries.add(a.charEnd)
	}
	const sorted = [...boundaries].sort((a, b) => a - b)

	const segments: ArticleSegment[] = []
	for (let i = 0; i < sorted.length - 1; i++) {
		const start = sorted[i]
		const end = sorted[i + 1]
		if (start === end) continue

		const text = plaintext.slice(start, end)
		const seg: ArticleSegment = { text }

		for (const a of filtered) {
			if (a.charStart <= start && a.charEnd >= end) {
				switch (a.kind) {
					case 'bold': seg.bold = true; break
					case 'italic': seg.italic = true; break
					case 'code': seg.code = true; break
					case 'strikethrough': seg.strikethrough = true; break
					case 'link': seg.linkUri = a.uri; break
				}
			}
		}

		segments.push(seg)
	}

	return segments
}

function lexiconListItemToArticle(item: UnorderedListItem | OrderedListItem): ArticleListItem {
	const content = item.content as { $type: string; plaintext: string; facets?: LeafletFacet[] }
	const segments = plaintextAndFacetsToSegments(content.plaintext, content.facets)
	const result: ArticleListItem = { segments, children: [] }

	if (typeof item.checked === 'boolean') result.checked = item.checked

	if ('children' in item && Array.isArray(item.children) && item.children.length > 0) {
		result.children = item.children.map(lexiconListItemToArticle)
	}

	return result
}

function lexiconBlockToArticle(block: LeafletBlock, warnings: string[]): ArticleBlock | ArticleBlock[] | null {
	const t = block.$type

	if (t === 'pub.leaflet.blocks.text') {
		const b = block as TextBlock
		return splitTextBlockIntoArticleBlocks(b.plaintext, b.facets)
	}

	if (t === 'pub.leaflet.blocks.header') {
		const b = block as HeaderBlock
		return { $type: 'header', level: b.level, segments: plaintextAndFacetsToSegments(b.plaintext, b.facets) }
	}

	if (t === 'pub.leaflet.blocks.blockquote') {
		const b = block as BlockquoteBlock
		return { $type: 'blockquote', segments: plaintextAndFacetsToSegments(b.plaintext, b.facets) }
	}

	if (t === 'pub.leaflet.blocks.code') {
		const b = block as CodeBlock
		return { $type: 'code', text: b.plaintext, ...(b.language ? { language: b.language } : {}) }
	}

	if (t === 'pub.leaflet.blocks.horizontalRule') {
		return { $type: 'horizontalRule' }
	}

	if (t === 'pub.leaflet.blocks.math') {
		const b = block as MathBlock
		const parsedTable = parseKatexGridTex(b.tex)
		if (parsedTable) {
			return {
				$type: 'table',
				rows: parsedTable.rows.map((row) => ({
					...(row.header ? { header: true } : {}),
					cells: row.cells.map((cell) => ({ plaintext: cell.plaintext })),
				})),
				...(parsedTable.alignments ? { alignments: parsedTable.alignments } : {}),
			}
		}
		return { $type: 'math', tex: b.tex }
	}

	if (t === 'pub.leaflet.blocks.unorderedList') {
		const b = block as UnorderedListBlock
		return { $type: 'unorderedList', items: b.children.map(lexiconListItemToArticle) }
	}

	if (t === 'pub.leaflet.blocks.orderedList') {
		const b = block as OrderedListBlock
		const result: ArticleBlock = { $type: 'orderedList', items: b.children.map(lexiconListItemToArticle) }
		if (typeof b.startIndex === 'number') (result as { $type: 'orderedList'; startIndex?: number; items: ArticleListItem[] }).startIndex = b.startIndex
		return result
	}

	warnings.push(`Unsupported block type skipped: ${t}`)
	return null
}

export type LexiconToArticleResult = {
	article: Article
	warnings: string[]
	publicationUri: string
}

export function lexiconToArticle(record: SiteStandardDocumentRecord): LexiconToArticleResult {
	const warnings: string[] = []
	const blocks: ArticleBlock[] = []

	const content = record.content
	if (!content || content.$type !== 'pub.leaflet.content') {
		warnings.push('Record has no pub.leaflet.content — cannot import blocks')
		return {
			article: {
				title: record.title ?? '',
				description: typeof record.description === 'string' ? record.description : '',
				tags: Array.isArray(record.tags) ? record.tags.filter((t): t is string => typeof t === 'string') : [],
				site: '',
				blocks: [],
			},
			warnings,
			publicationUri: '',
		}
	}

	const pages = content.pages ?? []
	for (let i = 0; i < pages.length; i++) {
		const page = pages[i] as { $type?: string; blocks?: LinearDocumentBlock[] }
		if (page.$type === 'pub.leaflet.pages.linearDocument' && Array.isArray(page.blocks)) {
			for (const wrapper of page.blocks) {
				if (!wrapper.block) {
					warnings.push('Empty block wrapper skipped')
					continue
				}
				const articleBlock = lexiconBlockToArticle(wrapper.block, warnings)
				if (!articleBlock) continue
				if (Array.isArray(articleBlock)) {
					blocks.push(...articleBlock)
				} else {
					blocks.push(articleBlock)
				}
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
		article: {
			title: record.title ?? '',
			description: typeof record.description === 'string' ? record.description : '',
			tags: Array.isArray(record.tags) ? record.tags.filter((t): t is string => typeof t === 'string') : [],
			site: record.site ?? '',
			blocks,
		},
		warnings,
		publicationUri,
	}
}
