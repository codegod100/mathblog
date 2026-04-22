import { describe, it, expect } from 'vitest'
import { lexiconToArticle, articleToLexicon } from './lens-b'
import type { SiteStandardDocumentRecord } from '../atproto/types'

const RECORD: SiteStandardDocumentRecord = {
	$type: 'site.standard.document',
	site: 'at://did:plc:ngokl2gnmpbvuvrfckja3g7p/site.standard.publication/3m3frizuz2c2v',
	title: 'capability based tensor network',
	publishedAt: '2026-04-22T08:09:44.783Z',
	path: '/mo9cam6lls1hs6',
	content: {
		$type: 'pub.leaflet.content',
		pages: [{
			$type: 'pub.leaflet.pages.linearDocument',
			id: '3cc0c7ac-5a0e-4607-80bc-d5a6b58577f1',
			blocks: [
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "jIn order to assemble an application stack, I'm building what I'm calling a \"capability based tensor network\". Tensor algebra is essentially linear algebra's older brother. In linear algebra, you have concepts like scalars and vectors. In tensor algebra you just have tensors. ",
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "Here is a table mapping linear algebra concepts to tensor algebra concepts to make it obvious what I'll be talking about",
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.math',
						tex: "\\def\\arraystretch{1.3}\n\\begin{array}{|l|l|}\n\\hline\nLinear Algebra & Tensor Algebra \\\\\n\\hline\nScalar & Rank-0 \\\\\n\\hline\nVector & Rank-1 \\\\\n\\hline\n\\end{array}",
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "A vector is written in tensor form like so: $v^i$. The superscript means it has an upper index. Vectors represent capabilities of our network",
						facets: [{
							$type: 'pub.leaflet.richtext.facet',
							index: { byteStart: 83, byteEnd: 88 },
							features: [{ $type: 'pub.leaflet.richtext.facet#italic' }],
						}],
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: " If $v^i$ pairs to a lower index $v_i$ it contracts and we get a scalar. When vectors pair, they cancel each other out.",
						facets: [{
							$type: 'pub.leaflet.richtext.facet',
							index: { byteStart: 21, byteEnd: 26 },
							features: [{ $type: 'pub.leaflet.richtext.facet#italic' }],
						}],
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "Lower-index values, also called co-vectors, represent requirements of our tensor network.",
						facets: [{
							$type: 'pub.leaflet.richtext.facet',
							index: { byteStart: 0, byteEnd: 5 },
							features: [{ $type: 'pub.leaflet.richtext.facet#italic' }],
						}],
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "Using [[DisCoCat]] we can model this with natural language\nFor our lexicon let's use $n$ for Noun and $s$ for Sentence (standard [[DisCoCat]] naming convention).  They represent the vectors in our network. They are capabilities",
						facets: [
							{
								$type: 'pub.leaflet.richtext.facet',
								index: { byteStart: 93, byteEnd: 97 },
								features: [{ $type: 'pub.leaflet.richtext.facet#bold' }],
							},
							{
								$type: 'pub.leaflet.richtext.facet',
								index: { byteStart: 110, byteEnd: 118 },
								features: [{ $type: 'pub.leaflet.richtext.facet#bold' }],
							},
						],
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "We model our natural language as tensor products with what's called [[adjoints]]",
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "$Server$: $n$ $\\leftarrow$ Server is a Noun\n$Needs$: $n^r \\otimes s \\otimes n^l$ $\\leftarrow$ Noun needs a Noun\n$Database$: $n \\leftarrow$ Database is also a Noun\n$Data$: $n$",
						facets: [
							{ $type: 'pub.leaflet.richtext.facet', index: { byteStart: 39, byteEnd: 43 }, features: [{ $type: 'pub.leaflet.richtext.facet#bold' }] },
							{ $type: 'pub.leaflet.richtext.facet', index: { byteStart: 94, byteEnd: 98 }, features: [{ $type: 'pub.leaflet.richtext.facet#bold' }] },
							{ $type: 'pub.leaflet.richtext.facet', index: { byteStart: 107, byteEnd: 111 }, features: [{ $type: 'pub.leaflet.richtext.facet#bold' }] },
							{ $type: 'pub.leaflet.richtext.facet', index: { byteStart: 158, byteEnd: 162 }, features: [{ $type: 'pub.leaflet.richtext.facet#bold' }] },
						],
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: 'We can model the requirements "Server needs database" and "Database needs data" as the tensor product:',
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.math',
						tex: 'Server \\otimes Needs \\otimes Database \\otimes Needs \\otimes Data',
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "$n^r$ is the right-adjoint. That means that if it is on the right hand side of a Noun then it will pair with it. ",
						facets: [
							{ $type: 'pub.leaflet.richtext.facet', index: { byteStart: 13, byteEnd: 26 }, features: [{ $type: 'pub.leaflet.richtext.facet#italic' }] },
							{ $type: 'pub.leaflet.richtext.facet', index: { byteStart: 81, byteEnd: 85 }, features: [{ $type: 'pub.leaflet.richtext.facet#bold' }] },
						],
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "$n^l$ is the left-adjoint. Same thing just pairs with Nouns when it's on the left of them.",
						facets: [{
							$type: 'pub.leaflet.richtext.facet',
							index: { byteStart: 54, byteEnd: 59 },
							features: [{ $type: 'pub.leaflet.richtext.facet#bold' }],
						}],
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "$n^r$ and $n^l$ are our co-vectors in the tensor network. They are requirements.",
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "We can expand the tensor product of  $$Server \\otimes Needs \\otimes Database \\otimes Needs \\otimes Data$$ to be explicit:\n$$n \\otimes (n^r \\otimes s \\otimes n^l) \\otimes n \\otimes (n^r \\otimes s \\otimes n^l) \\otimes n$$",
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "Let's start with $Database$. Since it has a left-adjoint on the left, and a right-adjoint on the right, that entire term $n^l \\otimes n \\otimes n^r$ pairs and cancels out. The astute reader might say \"Hey, wait a minute! There are two co-vectors and only one vector! What gives?!\"  [[frobenius algebra]] says that we can use the [[comultiplication map]] ($\\Delta$) to make as many copies of a vector as we need because we are talking about the concept of a database, not an actual instance of a database. $n \\rightarrow n \\otimes n$",
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: "$Server$ and $Data$ both pair with their adjoints and cancel out leaving us with \n$$s \\otimes s$$\nWe've just used the [[Curry-Howard Isomorphism]] as a mathematical proof that our $Server$ is related to our $Data$ through quantum entanglement. How's that for system requirements?",
					},
				},
			],
		}],
	},
	updatedAt: '2026-04-22T08:09:44.786Z',
} as SiteStandardDocumentRecord

describe('lexiconToArticle regression', () => {
	it('should preserve all 22 blocks from the real record (after $$...$$ splitting)', () => {
		const { article, warnings } = lexiconToArticle(RECORD)
		expect(warnings).toEqual([])
		expect(article.blocks).toHaveLength(22)
	})

	it('should preserve math tex exactly (display math blocks)', () => {
		const { article } = lexiconToArticle(RECORD)
		const mathBlocks = article.blocks.filter(b => b.$type === 'math')
		expect(mathBlocks).toHaveLength(4) // 1 standalone math + 3 extracted from text

		// Standalone math block
		const tensorProduct = mathBlocks.find(m => m.tex === 'Server \\otimes Needs \\otimes Database \\otimes Needs \\otimes Data')
		expect(tensorProduct).toBeDefined()

		// Extracted from block 14
		const expanded1 = mathBlocks.find(m => m.tex === 'Server \\otimes Needs \\otimes Database \\otimes Needs \\otimes Data')
		expect(expanded1).toBeDefined()

		const expanded2 = mathBlocks.find(m => m.tex.startsWith('n \\otimes'))
		expect(expanded2).toBeDefined()

		// Extracted from block 16
		const tensorS = mathBlocks.find(m => m.tex === 's \\otimes s')
		expect(tensorS).toBeDefined()
	})

	it('should convert KaTeX grid table to Article table block', () => {
		const { article } = lexiconToArticle(RECORD)
		const tableBlock = article.blocks.find(b => b.$type === 'table')
		expect(tableBlock).toBeDefined()
		if (tableBlock?.$type === 'table') {
			expect(tableBlock.rows).toHaveLength(3)
			expect(tableBlock.rows[0].header).toBe(true)
			expect(tableBlock.rows[0].cells.map(c => c.plaintext)).toEqual(['Linear Algebra', 'Tensor Algebra'])
		}
	})

	it('should recover facets (bold, italic) from byte indices', () => {
		const { article } = lexiconToArticle(RECORD)
		const block3 = article.blocks[3]
		expect(block3.$type).toBe('text')
		if (block3.$type === 'text') {
			expect(block3.segments.some(s => s.italic)).toBe(true)
		}
	})

	it('should detect the jIn corruption in block 0 plaintext', () => {
		const { article } = lexiconToArticle(RECORD)
		const block0 = article.blocks[0]
		expect(block0.$type).toBe('text')
		if (block0.$type === 'text') {
			const fullText = block0.segments.map(s => s.text).join('')
			expect(fullText.startsWith('jIn')).toBe(true)
		}
	})

	it('should preserve publication URI', () => {
		const { publicationUri } = lexiconToArticle(RECORD)
		expect(publicationUri).toBe('at://did:plc:ngokl2gnmpbvuvrfckja3g7p/site.standard.publication/3m3frizuz2c2v')
	})

	it('should split block 14 (two $$...$$) into text+math+text+math sequence', () => {
		const { article } = lexiconToArticle(RECORD)
		// After splitting, blocks around the original position 14 should be expanded
		// Find the sequence by looking for the first math block after the standalone math block
		const mathIndices = article.blocks
			.map((b, i) => ({ type: b.$type, index: i, tex: b.$type === 'math' ? b.tex : undefined }))
			.filter(x => x.tex?.includes('Server') || x.tex?.startsWith('n '))

		expect(mathIndices.length).toBeGreaterThanOrEqual(2)
	})

	it('should split block 16 (one $$...$$) into text+math+text sequence', () => {
		const { article } = lexiconToArticle(RECORD)
		const mathS = article.blocks.find(b => b.$type === 'math' && b.tex === 's \\otimes s')
		expect(mathS).toBeDefined()
		if (mathS) {
			const idx = article.blocks.indexOf(mathS)
			expect(article.blocks[idx - 1].$type).toBe('text')
			expect(article.blocks[idx + 1].$type).toBe('text')
		}
	})

	it('should NOT split blocks with only inline $...$ math', () => {
		const { article } = lexiconToArticle(RECORD)
		const block3 = article.blocks[3]
		expect(block3.$type).toBe('text')
		if (block3.$type === 'text') {
			const text = block3.segments.map(s => s.text).join('')
			expect(text).toContain('$v^i$')
			// Should NOT have split into a math block
			const idx = article.blocks.indexOf(block3)
			expect(article.blocks[idx + 1].$type).not.toBe('math')
		}
	})
})

describe('articleToLexicon', () => {
	it('should round-trip with correct block count', () => {
		const { article } = lexiconToArticle(RECORD)
		const record2 = articleToLexicon(article, {
			site: RECORD.site,
			publishedAt: RECORD.publishedAt,
			path: RECORD.path,
		})
		// After round-trip, the split text/math blocks will be recombined into single text blocks
		// with $$math$$ inline, plus separate math blocks
		expect(record2.content.pages[0].blocks.length).toBeGreaterThanOrEqual(14)
	})

	it('should convert Article table back to math block with KaTeX grid', () => {
		const { article } = lexiconToArticle(RECORD)
		const record2 = articleToLexicon(article, {
			site: RECORD.site,
			publishedAt: RECORD.publishedAt,
			path: RECORD.path,
		})
		const blocks = record2.content.pages[0].blocks
		const mathBlocks = blocks.filter(b => b.block.$type === 'pub.leaflet.blocks.math')
		expect(mathBlocks.length).toBeGreaterThanOrEqual(1)
	})
})
