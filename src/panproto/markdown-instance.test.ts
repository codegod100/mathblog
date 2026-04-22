import { describe, it, expect } from 'vitest'
import { parseMarkdownToMdDocument, emitMarkdownFromMdDocument } from './markdown-instance'
import type { EditorDraft } from '../atproto/types'

function draft(md: string): EditorDraft {
	return {
		title: 'Test',
		description: '',
		tags: '',
		markdown: md,
		publicationUri: '',
		status: 'local-draft',
		updatedAt: new Date().toISOString(),
	}
}

describe('parseMarkdownToMdDocument', () => {
	it('should extract display math blocks', () => {
		const doc = parseMarkdownToMdDocument(draft('$$x^2$$'))
		expect(doc.blocks).toHaveLength(1)
		expect(doc.blocks[0]).toEqual({ $type: 'math', tex: 'x^2' })
	})

	it('should preserve inline math in paragraph segments', () => {
		const doc = parseMarkdownToMdDocument(draft('Hello $x^2$ world'))
		expect(doc.blocks[0].$type).toBe('paragraph')
		if (doc.blocks[0].$type === 'paragraph') {
			const text = doc.blocks[0].segments.map(s => s.text).join('')
			expect(text).toContain('x²')
			expect(text).not.toContain('$x^2$')
		}
	})

	it('should parse bold and italic with correct segment boundaries', () => {
		const doc = parseMarkdownToMdDocument(draft('**bold** and *italic*'))
		expect(doc.blocks[0].$type).toBe('paragraph')
		if (doc.blocks[0].$type === 'paragraph') {
			expect(doc.blocks[0].segments).toEqual([
				{ text: 'bold', bold: true },
				{ text: ' and ' },
				{ text: 'italic', italic: true },
			])
		}
	})

	it('should parse GFM tables into rows and alignments', () => {
		const md = '| A | B |\n|---|---|\n| 1 | 2 |'
		const doc = parseMarkdownToMdDocument(draft(md))
		expect(doc.blocks[0].$type).toBe('table')
		if (doc.blocks[0].$type === 'table') {
			expect(doc.blocks[0].rows).toHaveLength(2)
			expect(doc.blocks[0].rows[0].header).toBe(true)
			expect(doc.blocks[0].rows[0].cells.map(c => c.plaintext)).toEqual(['A', 'B'])
		}
	})
})

describe('emitMarkdownFromMdDocument', () => {
	it('should emit display math as $$...$$', () => {
		const md = '$$\nx^2\n$$'
		const doc = parseMarkdownToMdDocument(draft(md))
		const out = emitMarkdownFromMdDocument(doc)
		expect(out).toContain('$$\nx^2\n$$')
	})

	it('should emit inline math as unicode text', () => {
		const doc = parseMarkdownToMdDocument(draft('Hello $x^2$ world'))
		const out = emitMarkdownFromMdDocument(doc)
		expect(out).toContain('x²')
		expect(out).not.toContain('$x^2$')
	})

	it('should emit tables with correct delimiter alignment', () => {
		const md = '| A | B |\n|---|---|\n| 1 | 2 |'
		const doc = parseMarkdownToMdDocument(draft(md))
		const out = emitMarkdownFromMdDocument(doc)
		expect(out).toContain('| A | B |')
		expect(out).toContain('| --- | --- |')
	})
})

describe('round-trip', () => {
	it('should preserve simple paragraph', () => {
		const md = 'Hello world'
		const doc = parseMarkdownToMdDocument(draft(md))
		const out = emitMarkdownFromMdDocument(doc)
		expect(out).toBe(md)
	})

	it('should preserve inline math through round-trip as unicode', () => {
		const md = 'Let $v^i$ be a vector.'
		const doc = parseMarkdownToMdDocument(draft(md))
		const out = emitMarkdownFromMdDocument(doc)
		expect(out).toBe('Let vⁱ be a vector.')
	})

	it('should preserve display math through round-trip', () => {
		const md = '$$\n\\sum_{i=0}^n x_i\n$$'
		const doc = parseMarkdownToMdDocument(draft(md))
		const out = emitMarkdownFromMdDocument(doc)
		expect(out).toBe(md)
	})
})
