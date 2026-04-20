import './app-root'
import './article-view'

const app = document.getElementById('app')!
const path = window.location.pathname

if (path.startsWith('/article/')) {
  const parts = path.slice('/article/'.length).split('/')
  const did = parts[0] ?? ''
  const rkey = parts.slice(1).join('/')
  const el = document.createElement('article-view')
  el.setAttribute('did', did)
  el.setAttribute('rkey', rkey)
  app.appendChild(el)
} else {
  const el = document.createElement('app-root')
  app.appendChild(el)
}
