import katex from 'katex'
import { marked } from 'marked'

type TableAlignment = 'left' | 'center' | 'right' | null

type MathToken = {
  key: string
  html: string
}

export function renderMath(markdown: string): string {
  const tokens: MathToken[] = []
  let index = 0

  const stash = (htmlValue: string) => {
    const key = `@@KATEX_${index++}@@`
    tokens.push({ key, html: htmlValue })
    return key
  }

  const protectedMarkdown = markdown
    .replace(/```[\s\S]*?```/g, (match) => stash(match))
    .replace(/`[^`]+`/g, (match) => stash(match))

  const renderedTables = marked.lexer(protectedMarkdown, { gfm: true, breaks: true })
    .map((token) => {
      if (token.type !== 'table') return token.raw

      const header = token.header.map((cell: { text: string }) => cell.text)
      const rows = token.rows.map((row: Array<{ text: string }>) => row.map((cell: { text: string }) => cell.text))
      const alignments = token.align as TableAlignment[] | undefined
      const tex = tableToKatexArrayTex([
        { header: true, cells: header },
        ...rows.map((row: string[]) => ({ cells: row })),
      ], alignments)

      try {
        return stash(
          katex.renderToString(tex, {
            displayMode: true,
            throwOnError: false,
          }),
        )
      } catch {
        return token.raw
      }
    })
    .join('')

  const withDisplayMath = renderedTables.replace(/\$\$([\s\S]+?)\$\$/g, (_, expression: string) => {
    try {
      return stash(
        katex.renderToString(expression.trim(), {
          displayMode: true,
          throwOnError: false,
        }),
      )
    } catch {
      return `$$${expression}$$`
    }
  })

  const withInlineMath = withDisplayMath.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, expression: string) => {
    try {
      return stash(
        katex.renderToString(expression.trim(), {
          displayMode: false,
          throwOnError: false,
        }),
      )
    } catch {
      return `$${expression}$`
    }
  })

  let htmlOutput = marked.parse(withInlineMath, {
    breaks: true,
    gfm: true,
  }) as string

  for (const token of tokens) {
    htmlOutput = htmlOutput.replaceAll(token.key, token.html)
  }

  return htmlOutput
}

function escapeTexCell(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([#$%&_{}])/g, '\\$1')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
}

function tableToKatexArrayTex(rows: { header?: boolean; cells: string[] }[], alignments?: TableAlignment[]): string {
  const headerRow = rows.find((row) => row.header) ?? rows[0]
  const bodyRows = headerRow ? rows.filter((row) => row !== headerRow) : []
  const columnCount = headerRow?.cells.length ?? Math.max(0, ...rows.map((row) => row.cells.length))
  const spec = Array.from({ length: columnCount }, (_, index) => {
    const alignment = alignments?.[index]
    if (alignment === 'center') return 'c'
    if (alignment === 'right') return 'r'
    return 'l'
  }).join('')

  const texRows: string[] = []
  if (headerRow) {
    const headerCells = Array.from({ length: columnCount }, (_, index) => escapeTexCell(headerRow.cells[index] ?? ''))
    texRows.push(`${headerCells.join(' & ')} \\\\`)
    texRows.push('\\hline')
  }

  for (const row of bodyRows) {
    const cells = Array.from({ length: columnCount }, (_, index) => escapeTexCell(row.cells[index] ?? ''))
    texRows.push(`${cells.join(' & ')} \\\\`)
  }

  if (!headerRow) {
    for (const row of rows) {
      const cells = Array.from({ length: columnCount }, (_, index) => escapeTexCell(row.cells[index] ?? ''))
      texRows.push(`${cells.join(' & ')} \\\\`)
    }
  }

  while (texRows.length > 0 && texRows[texRows.length - 1].trim() === '\\\\') {
    texRows.pop()
  }

  return `\\begin{array}{${spec || 'l'}}\n${texRows.join('\n')}\n\\end{array}`
}
