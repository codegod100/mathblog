import katex from 'katex'
import { marked } from 'marked'
import { tableToKatexGridTex, type TableAlignment } from './table-katex'

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
      const tex = tableToKatexGridTex([
        { header: true, cells: header.map((plaintext: string) => ({ plaintext })) },
        ...rows.map((row: string[]) => ({ cells: row.map((plaintext: string) => ({ plaintext })) })),
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
