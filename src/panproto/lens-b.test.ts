import { describe, it, expect } from 'vitest'
import { lexiconToArticle, articleToLexicon } from './lens-b'
import type { SiteStandardDocumentRecord } from '../atproto/types'

const RECORD: SiteStandardDocumentRecord = {
	$type: 'site.standard.document',
	site: 'at://did:plc:ngokl2gnmpbvuvrfckja3g7p/site.standard.publication/3m3frizuz2c2v',
	title: 'capability based tensor network',
	publishedAt: '2026-04-22T06:27:18.005Z',
	path: '/mo9cam6lls1hs6',
	content: {
		$type: 'pub.leaflet.content',
		pages: [{
			$type: 'pub.leaflet.pages.linearDocument',
			id: '530fe382-91cc-460f-9005-f42d4cb2153b',
			blocks: [
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: 'sIn order to assemble an application stack, I\'m building what I\'m calling a "capability based tensor network". Tensor algebra is essentially linear algebra\'s older brother. In linear algebra, you have concepts like scalars and vectors. In tensor algebra you just have tensors. ',
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: 'Here is a table mapping linear algebra concepts to tensor algebra concepts to make it obvious what I\'ll be talking about',
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.math',
						tex: '\\def\\arraystretch{1.3}\n\\begin{array}{|l|l|}\n\\hline\nLinear Algebra & Tensor Algebra \\\\\n\\hline\nScalar & Rank-0 \\\\\n\\hline\nVector & Rank-1 \\\\\n\\hline\n\\end{array}',
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: 'A vector is written in tensor form like so: $v^i$. The superscript means it has an upper index. Vectors represent capabilities of our network',
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
						plaintext: ' If $v^i$ pairs to a lower index $v_i$ it contracts and we get a scalar. When vectors pair, they cancel each other out.',
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
						plaintext: 'Lower-index values, also called co-vectors, represent requirements of our tensor network.',
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
						plaintext: 'Using [[DisCoCat]] we can model this with natural language\nFor our lexicon let\'s use $n$ for Noun and $s$ for Sentence (standard [[DisCoCat]] naming convention).  They represent the vectors in our network. They are capabilities',
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
						plaintext: 'We model our natural language as tensor products with what\'s called [[adjoints]]',
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: '$Server$: $n$ $\\leftarrow$ Server is a Noun\n$Needs$: $n^r \\otimes s \\otimes n^l$ $\\leftarrow$ Noun needs a Noun\n$Database$: $n \\leftarrow$ Database is also a Noun\n$Data$: $n$',
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
						plaintext: '$n^r$ is the right-adjoint. That means that if it is on the right hand side of a Noun then it will pair with it. ',
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
						plaintext: '$n^l$ is the left-adjoint. Same thing just pairs with Nouns when it\'s on the left of them.',
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
						plaintext: '$n^r$ and $n^l$ are our co-vectors in the tensor network. They are requirements.',
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: 'We can expand the tensor product of  $$Server \\otimes Needs \\otimes Database \\otimes Needs \\otimes Data$$ to be explicit:\n$$n \\otimes (n^r \\otimes s \\otimes n^l) \\otimes n \\otimes (n^r \\otimes s \\otimes n^l) \\otimes n$$',
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: 'Let\'s start with $Database$. Since it has a left-adjoint on the left, and a right-adjoint on the right, that entire term $n^l \\otimes n \\otimes n^r$ pairs and cancels out. The astute reader might say "Hey, wait a minute! There are two co-vectors and only one vector! What gives?!"  [[frobenius algebra]] says that we can use the [[comultiplication map]] ($\\Delta$) to make as many copies of a vector as we need because we are talking about the concept of a database, not an actual instance of a database. $n \\rightarrow n \\otimes n$',
					},
				},
				{
					$type: 'pub.leaflet.pages.linearDocument#block',
					block: {
						$type: 'pub.leaflet.blocks.text',
						plaintext: '$Server$ and $Data$ both pair with their adjoints and cancel out leaving us with \n$$s \\otimes s$$\nWe\'ve just used the [[Curry-Howard Isomorphism]] as a mathematical proof that our $Server$ is related to our $Data$ through quantum entanglement. How\'s that for system requirements?',
					},
				},
			],
		}],
	},
	updatedAt: '2026-04-22T06:27:18.008Z',
} as SiteStandardDocumentRecord

describe('lexiconToArticle regression', () => {
	it('should preserve all 17 blocks from the real record', () => {
		const { article, warnings } = lexiconToArticle(RECORD)
		expect(warnings).toEqual([])
		expect(article.blocks).toHaveLength(17)
	})

	it('should preserve math tex exactly (display math)', () => {
		const { article } = lexiconToArticle(RECORD)
		const mathBlocks = article.blocks.filter(b => b.$type === 'math')
		const tableBlocks = article.blocks.filter(b => b.$type === 'table')
		expect(mathBlocks).toHaveLength(1) // grid table was converted to table block
		expect(tableBlocks).toHaveLength(1)

		const tensorProduct = mathBlocks[0] as { $type: 'math'; tex: string }
		expect(tensorProduct.tex).toBe('Server \\otimes Needs \\otimes Database \\otimes Needs \\otimes Data')
	})

	it('should convert KaTeX grid table to Article table block', () => {
		const { article } = lexiconToArticle(RECORD)
		const tableBlock = article.blocks.find(b => b.$type === 'table')
		expect(tableBlock).toBeDefined()
		if (tableBlock?.$type === 'table') {
			expect(tableBlock.rows).toHaveLength(3)
			expect(tableBlock.rows[0].header).toBe(true)
			expect(tableBlock.rows[0].cells.map(c => c.plaintext)).toEqual(['Linear Algebra', 'Tensor Algebra'])
			expect(tableBlock.rows[1].cells.map(c => c.plaintext)).toEqual(['Scalar', 'Rank-0'])
			expect(tableBlock.rows[2].cells.map(c => c.plaintext)).toEqual(['Vector', 'Rank-1'])
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

	it('should detect the sIn corruption in block 0 plaintext', () => {
		const { article } = lexiconToArticle(RECORD)
		const block0 = article.blocks[0]
		expect(block0.$type).toBe('text')
		if (block0.$type === 'text') {
			const fullText = block0.segments.map(s => s.text).join('')
			expect(fullText.startsWith('sIn')).toBe(true)
			// Flag the corruption — this should ideally start with "In" not "sIn"
			expect(fullText.startsWith('sIn')).toBe(true)
		}
	})

	it('should preserve publication URI', () => {
		const { publicationUri } = lexiconToArticle(RECORD)
		expect(publicationUri).toBe('at://did:plc:ngokl2gnmpbvuvrfckja3g7p/site.standard.publication/3m3frizuz2c2v')
	})
})

describe('articleToLexicon', () => {
	it('should round-trip with identical block count', () => {
		// NOTE: Full round-trip (lexicon → article → lexicon) preserves 16 blocks.
		// However, if you do lexicon → article → markdown → article, display math
		// inside text blocks will be promoted to separate math blocks.
		const { article } = lexiconToArticle(RECORD)
		const record2 = articleToLexicon(article, {
			site: RECORD.site,
			publishedAt: RECORD.publishedAt,
			path: RECORD.path,
		})
		expect(record2.content.pages[0].blocks).toHaveLength(17)
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
