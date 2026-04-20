import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'

const isDev = process.env.NODE_ENV !== 'production'
const PORT = 6080

function shellHtml(title: string): string {
  if (isDev) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="/src/index.css" />
    <script type="module" src="/src/main.ts"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`
  }

  let jsFile = ''
  let cssFile = ''
  try {
    const { readdirSync } = require('node:fs')
    const { resolve } = require('node:path')
    const assetsDir = resolve(__dirname, '../dist/assets')
    const files = readdirSync(assetsDir)
    jsFile = files.find((f: string) => f.endsWith('.js') && f.startsWith('main')) || ''
    cssFile = files.find((f: string) => f.endsWith('.css')) || ''
  } catch { /* empty */ }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}" />` : ''}
  </head>
  <body>
    <div id="app"></div>
    ${jsFile ? `<script type="module" src="/assets/${jsFile}"></script>` : ''}
  </body>
</html>`
}

function sendHtml(res: ServerResponse, html: string) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}

function isPageRoute(pathname: string): boolean {
  if (pathname === '/' || pathname === '/oauth/callback') return true
  if (pathname.startsWith('/article/')) return true
  return false
}

function handlePageRoute(pathname: string, res: ServerResponse) {
  if (pathname === '/' || pathname === '/oauth/callback') {
    sendHtml(res, shellHtml('Leaflet Markdown Editor'))
  } else if (pathname.startsWith('/article/')) {
    const parts = pathname.slice('/article/'.length).split('/')
    const rkey = parts.slice(1).join('/') || 'article'
    sendHtml(res, shellHtml(`Article — ${rkey}`))
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
}

async function main() {
  let handler: (req: IncomingMessage, res: ServerResponse) => void

  if (isDev) {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })

    handler = (req, res) => {
      const url = req.url ?? '/'
      if (isPageRoute(url.split('?')[0])) {
        handlePageRoute(url.split('?')[0], res)
        return
      }
      vite.middlewares(req, res, () => {
        handlePageRoute(url.split('?')[0], res)
      })
    }
  } else {
    const { serveStatic } = await import('@hono/node-server/serve-static')
    const { Hono } = await import('hono')
    const app = new Hono()

    app.use('/assets/*', serveStatic({ root: './dist' }))
    app.use('/favicon.svg', serveStatic({ root: './dist' }))
    app.use('/lexicons/*', serveStatic({ root: './public' }))

    app.get('/', (c) => c.html(shellHtml('Leaflet Markdown Editor')))
    app.get('/oauth/callback', (c) => c.html(shellHtml('Leaflet Markdown Editor')))
    app.get('/article/:did/:rkey', (c) => {
      const rkey = c.req.param('rkey')
      return c.html(shellHtml(`Article — ${rkey}`))
    })

    handler = (req, res) => {
      app.fetch(req as any, res as any)
    }
  }

  const server = createHttpServer(handler)
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running at http://127.0.0.1:${PORT}`)
  })
}

main().catch(console.error)
