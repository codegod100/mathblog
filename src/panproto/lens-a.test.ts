import { describe, it, expect } from 'vitest'
import { mdDocumentToArticle, articleToMdDocument } from './lens-a'
import type { MdDocument } from './markdown-instance'

const SAMPLE_DOC: MdDocument = {
	title: 'Test',
	description: '',
	tags: [],
	publicationUri: '',
	blocks: [
		{ $type: 'heading', level: 1, segments: [{ text: 'Hello' }] },
		{ $type: 'paragraph', segments: [{ text: 'world' }, { text: 'foo', bold: true }] },
		{ $type: 'math', tex: 'x^2' },
		{
			$type: 'table',
			rows: [
				{ header: true, cells: [{ plaintext: 'A' }, { plaintext: 'B' }] },
				{ cells: [{ plaintext: '1' }, { plaintext: '2' }] },
			],
			alignments: ['left', 'center'],
		},
	],
}

describe('mdDocumentToArticle / articleToMdDocument', () => {
	it('should be inverse operations (lossless round-trip)', () => {
		const article = mdDocumentToArticle(SAMPLE_DOC)
		const doc2 = articleToMdDocument(article)
		expect(doc2.title).toBe(SAMPLE_DOC.title)
		expect(doc2.blocks).toHaveLength(SAMPLE_DOC.blocks.length)
		expect(doc2.blocks[0]).toEqual(SAMPLE_DOC.blocks[0])
		expect(doc2.blocks[1]).toEqual(SAMPLE_DOC.blocks[1])
		expect(doc2.blocks[2]).toEqual(SAMPLE_DOC.blocks[2])
	})

	it('should preserve table header/body distinction', () => {
		const article = mdDocumentToArticle(SAMPLE_DOC)
		const doc2 = articleToMdDocument(article)
		const table = doc2.blocks.find(b => b.$type === 'table')
		expect(table).toBeDefined()
		if (table?.$type === 'table') {
			expect(table.rows[0].header).toBe(true)
			expect(table.rows[1].header).toBeUndefined()
		}
	})

	it('should preserve math tex strings exactly', () => {
		const article = mdDocumentToArticle(SAMPLE_DOC)
		const doc2 = articleToMdDocument(article)
		const math = doc2.blocks.find(b => b.$type === 'math')
		expect(math).toEqual({ $type: 'math', tex: 'x^2' })
	})
})
