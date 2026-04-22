// LaTeX → Unicode converter for inline math that Leaflet can't render.
// Covers superscripts, subscripts, Greek letters, operators, arrows, relations.

const SUPERSCRIPT_MAP: Record<string, string> = {
	'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
	'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
	'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
	'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
	'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
	'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ', 'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ',
	'α': 'ᵅ', 'β': 'ᵝ', 'γ': 'ᵞ', 'δ': 'ᵟ', 'ε': 'ᵋ', 'θ': 'ᶿ', 'ι': 'ᶥ', 'φ': 'ᵠ', 'χ': 'ᵡ',
	'(': '⁽', ')': '⁾', '+': '⁺', '-': '⁻', '=': '⁼', ' ': ' ', ',': 'ʻ',
}

const SUBSCRIPT_MAP: Record<string, string> = {
	'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
	'a': 'ₐ', 'e': 'ₑ', 'i': 'ᵢ', 'o': 'ₒ', 'u': 'ᵤ',
	'β': 'ᵦ', 'γ': 'ᵧ', 'ρ': 'ᵨ', 'φ': 'ᵩ', 'χ': 'ᵪ',
	'(': '₍', ')': '₎', '+': '₊', '-': '₋', '=': '₌',
}

const COMMAND_MAP: Record<string, string> = {
	// Greek lowercase
	'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ε', 'zeta': 'ζ', 'eta': 'η',
	'theta': 'θ', 'iota': 'ι', 'kappa': 'κ', 'lambda': 'λ', 'mu': 'μ', 'nu': 'ν', 'xi': 'ξ',
	'omicron': 'ο', 'pi': 'π', 'rho': 'ρ', 'sigma': 'σ', 'tau': 'τ', 'upsilon': 'υ',
	'phi': 'φ', 'chi': 'χ', 'psi': 'ψ', 'omega': 'ω',
	// Greek uppercase
	'Gamma': 'Γ', 'Delta': 'Δ', 'Theta': 'Θ', 'Lambda': 'Λ', 'Xi': 'Ξ', 'Pi': 'Π',
	'Sigma': 'Σ', 'Phi': 'Φ', 'Psi': 'Ψ', 'Omega': 'Ω',
	// Operators
	'otimes': '⊗', 'oplus': '⊕', 'ominus': '⊖', 'odot': '⊙', 'oslash': '⊘',
	'cdot': '·', 'times': '×', 'pm': '±', 'mp': '∓',
	// Arrows
	'rightarrow': '→', 'leftarrow': '←', 'Rightarrow': '⇒', 'Leftarrow': '⇐',
	'leftrightarrow': '↔', 'Leftrightarrow': '⇔', 'mapsto': '↦',
	'uparrow': '↑', 'downarrow': '↓', 'Uparrow': '⇑', 'Downarrow': '⇓',
	// Relations
	'leq': '≤', 'geq': '≥', 'neq': '≠', 'approx': '≈', 'equiv': '≡',
	'sim': '∼', 'propto': '∝', 'perp': '⊥', 'parallel': '∥',
	// Sets / logic
	'in': '∈', 'notin': '∉', 'subset': '⊂', 'subseteq': '⊆',
	'supset': '⊃', 'supseteq': '⊇', 'cup': '∪', 'cap': '∩',
	'emptyset': '∅', 'forall': '∀', 'exists': '∃', 'nexists': '∄', 'neg': '¬',
	// Misc
	'infty': '∞', 'partial': '∂', 'nabla': '∇', 'angle': '∠',
	'bot': '⊥', 'top': '⊤', 'square': '□', 'blacksquare': '■',
	'lfloor': '⌊', 'rfloor': '⌋', 'lceil': '⌈', 'rceil': '⌉',
	'lldots': '…', 'cdots': '⋯', 'vdots': '⋮', 'ddots': '⋱',
	'sum': 'Σ', 'int': '∫', 'prod': '∏', 'sqrt': '√',
	// Spacing
	',': ' ', ';': ' ', ' ': ' ',
	// Boxed
	'boxed': '', // dropped — just unwrap
	// Mathbb (only common ones have Unicode approximations)
	'mathbb{R}': 'ℝ', 'mathbb{Z}': 'ℤ', 'mathbb{N}': 'ℕ', 'mathbb{Q}': 'ℚ', 'mathbb{C}': 'ℂ',
	'mathbb{P}': 'ℙ', 'mathbb{H}': 'ℍ',
}

function toSuperscript(text: string): string {
	return [...text].map(ch => {
		const exact = SUPERSCRIPT_MAP[ch]
		if (exact) return exact
		// Try lowercase fallback
		const lower = ch.toLowerCase()
		const lowerMatch = SUPERSCRIPT_MAP[lower]
		if (lowerMatch) return lowerMatch
		return ch
	}).join('')
}

function toSubscript(text: string): string {
	return [...text].map(ch => {
		const exact = SUBSCRIPT_MAP[ch]
		if (exact) return exact
		return ch
	}).join('')
}

function convertCommand(name: string, arg?: string): string {
	// \mathbb{R} etc
	if (name === 'mathbb' && arg) {
		const key = `mathbb{${arg}}`
		if (key in COMMAND_MAP) return COMMAND_MAP[key]
		return arg
	}
	// \frac{a}{b}
	if (name === 'frac' && arg) {
		const parts = arg.split(/(?<!\\)\}\s*\{/)
		if (parts.length >= 2) {
			const num = convertExpression(parts[0].replace(/^\{/, ''))
			const den = convertExpression(parts[1].replace(/\}$/, ''))
			return `${num}⁄${den}`
		}
		return arg
	}
	// \sqrt{x} → √x
	if (name === 'sqrt' && arg) {
		return '√' + convertExpression(arg)
	}
	// Generic command lookup
	if (name in COMMAND_MAP) return COMMAND_MAP[name]
	// Unknown command — strip backslash, preserve arg if any
	return name + (arg ? `{${arg}}` : '')
}

function convertExpression(expr: string): string {
	let result = ''
	let i = 0

	while (i < expr.length) {
		const ch = expr[i]

		if (ch === '\\') {
			// Parse command name
			let j = i + 1
			while (j < expr.length && /[a-zA-Z]/.test(expr[j])) j++
			const name = expr.slice(i + 1, j)
			// Skip optional star
			if (expr[j] === '*') j++

			// Parse argument if present
			let arg: string | undefined
			if (expr[j] === '{') {
				let braceDepth = 1
				let k = j + 1
				while (k < expr.length && braceDepth > 0) {
					if (expr[k] === '{') braceDepth++
					if (expr[k] === '}') braceDepth--
					if (braceDepth === 0) break
					k++
				}
				arg = expr.slice(j + 1, k)
				i = k + 1
			} else {
				i = j
			}

			result += convertCommand(name, arg)
			continue
		}

		if (ch === '^') {
			// Superscript — next char, or braced group
			if (expr[i + 1] === '{') {
				const end = expr.indexOf('}', i + 2)
				if (end !== -1) {
					result += toSuperscript(expr.slice(i + 2, end))
					i = end + 1
					continue
				}
			} else {
				result += toSuperscript(expr[i + 1] || '')
				i += 2
				continue
			}
		}

		if (ch === '_') {
			// Subscript — next char, or braced group
			if (expr[i + 1] === '{') {
				const end = expr.indexOf('}', i + 2)
				if (end !== -1) {
					result += toSubscript(expr.slice(i + 2, end))
					i = end + 1
					continue
				}
			} else {
				result += toSubscript(expr[i + 1] || '')
				i += 2
				continue
			}
		}

		if (ch === '{') {
			// Balanced group
			let braceDepth = 1
			let j = i + 1
			while (j < expr.length && braceDepth > 0) {
				if (expr[j] === '{') braceDepth++
				if (expr[j] === '}') braceDepth--
				if (braceDepth === 0) break
				j++
			}
			result += convertExpression(expr.slice(i + 1, j))
			i = j + 1
			continue
		}

		if (ch === '}') {
			i++
			continue
		}

		// Regular character
		result += ch
		i++
	}

	return result
}

export function texToUnicode(tex: string): string {
	// Remove LaTeX display math wrappers if present
	let expr = tex.trim()
		.replace(/^\$\$?/, '')
		.replace(/\$\$?$/, '')
		.trim()

	return convertExpression(expr)
}
