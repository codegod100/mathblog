import katex from 'katex'
import { marked } from 'marked'

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

  const withDisplayMath = protectedMarkdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, expression: string) => {
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
