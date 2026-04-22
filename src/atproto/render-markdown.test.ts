import { describe, it, expect } from 'vitest'
import { renderMath } from './render-markdown'

describe('renderMath', () => {
	it('should render inline math as katex span', () => {
		const html = renderMath('Hello $x^2$ world')
		expect(html).toContain('<span class="katex">')
		expect(html).toContain('x')
		expect(html).toContain('2')
	})

	it('should render display math as katex-display', () => {
		const html = renderMath('$$\\sum_{i=0}^n x_i$$')
		expect(html).toContain('<span class="katex-display">')
	})

	it('should not render inline code contents as math', () => {
		const html = renderMath('`$x^2$`')
		// The inline code stash prevents math rendering inside backticks,
		// but marked doesn't generate <code> tags because the backticks are stashed
		expect(html).toContain('`$x^2$`')  // literal backticks with $x^2$ inside
		expect(html).not.toContain('<span class="katex"><span class="katex-html">')
	})

	it('should render tables via katex grid', () => {
		const md = '| A | B |\n|---|---|\n| 1 | 2 |'
		const html = renderMath(md)
		expect(html).toContain('<span class="katex">')
		expect(html).toContain('A')
		expect(html).toContain('B')
	})

	it('should handle empty input', () => {
		const html = renderMath('')
		expect(html).toBe('')
	})
})
