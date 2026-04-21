export type TableAlignment = 'left' | 'center' | 'right' | null

export type PlaintextTableCell = {
	plaintext: string
}

export type PlaintextTableRow = {
	header?: boolean
	cells: PlaintextTableCell[]
}

export type ParsedKatexTable = {
	rows: PlaintextTableRow[]
	alignments?: TableAlignment[]
}

function escapeTexCell(value: string): string {
	return value
		.replace(/\\/g, '\\textbackslash{}')
		.replace(/([#$%&_{}])/g, '\\$1')
		.replace(/\^/g, '\\textasciicircum{}')
		.replace(/~/g, '\\textasciitilde{}')
}

function unescapeTexCell(value: string): string {
	return value
		.replace(/\\textbackslash\{\}/g, '\\')
		.replace(/\\textasciicircum\{\}/g, '^')
		.replace(/\\textasciitilde\{\}/g, '~')
		.replace(/\\([#$%&_{}])/g, '$1')
}

export function tableToKatexGridTex(rows: PlaintextTableRow[], alignments?: TableAlignment[]): string {
	const headerRow = rows.find((row) => row.header) ?? rows[0]
	const bodyRows = headerRow ? rows.filter((row) => row !== headerRow) : rows
	const columnCount = headerRow?.cells.length ?? Math.max(0, ...rows.map((row) => row.cells.length))
	const spec = Array.from({ length: Math.max(columnCount, 1) }, (_, index) => {
		const alignment = alignments?.[index]
		if (alignment === 'center') return 'c'
		if (alignment === 'right') return 'r'
		return 'l'
	}).join('|')

	const texRows: string[] = ['\\hline']

	if (headerRow) {
		const headerCells = Array.from(
			{ length: Math.max(columnCount, 1) },
			(_, index) => escapeTexCell(headerRow.cells[index]?.plaintext ?? ''),
		)
		texRows.push(`${headerCells.join(' & ')} \\\\`)
		texRows.push('\\hline')
	}

	for (const row of bodyRows) {
		const cells = Array.from(
			{ length: Math.max(columnCount, 1) },
			(_, index) => escapeTexCell(row.cells[index]?.plaintext ?? ''),
		)
		texRows.push(`${cells.join(' & ')} \\\\`)
		texRows.push('\\hline')
	}

	if (!headerRow && bodyRows.length === 0) {
		texRows.push('\\hline')
	}

	return `\\def\\arraystretch{1.3}\n\\begin{array}{|${spec}|}\n${texRows.join('\n')}\n\\end{array}`
}

export function parseKatexGridTex(tex: string): ParsedKatexTable | null {
	const match = tex.match(/^\\def\\arraystretch\{1\.3\}\s*\\begin\{array\}\{([|lcr]+)\}\s*([\s\S]*?)\s*\\end\{array\}$/)
	if (!match) return null

	const [, rawSpec, body] = match
	const spec = rawSpec.replace(/\|/g, '')
	if (!spec || /[^lcr]/.test(spec)) return null

	const rawLines = body
		.split(/\n+/)
		.map((line) => line.trim())
		.filter(Boolean)

	const rows: PlaintextTableRow[] = []
	let awaitingHeaderDivider = false

	for (const line of rawLines) {
		if (line === '\\hline') {
			if (awaitingHeaderDivider && rows.length > 0) {
				rows[0].header = true
				awaitingHeaderDivider = false
			}
			continue
		}

		const normalized = line.endsWith('\\\\') ? line.slice(0, -2).trim() : line
		const cells = normalized.split(/\s*&\s*/).map((cell) => ({ plaintext: unescapeTexCell(cell.trim()) }))
		rows.push({ cells })

		if (rows.length === 1) {
			awaitingHeaderDivider = true
		}
	}

	if (rows.length === 0) return null

	const alignments: TableAlignment[] = [...spec].map((char) => {
		if (char === 'c') return 'center'
		if (char === 'r') return 'right'
		return 'left'
	})

	return {
		rows,
		...(alignments.length > 0 ? { alignments } : {}),
	}
}
