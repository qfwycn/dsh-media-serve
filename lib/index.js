import { readFile, stat } from 'node:fs/promises'
import { extname, isAbsolute, join, resolve, sep } from 'node:path'

/**
 * @module dsh-media-serve
 * Host-side plugin for DeepSeek Harness.
 *
 * Registers a `prefix` web route at `/media` that serves media/text files from
 * the DeepSeek Harness workspace(s). Once installed, any conversation can
 * display a local image by emitting a markdown image whose src is
 * `http://<host>:<port>/media/<relative-path>`, e.g.
 *
 *   ![screenshot](http://127.0.0.1:3080/media/screenshots/search_qfwys_full.png)
 *
 * Because the route lives on the same web server the GUI is served from, the
 * browser can load it without any extra process or port.
 *
 * ROOT RESOLUTION (portable across machines / workspaces):
 *   The served root is NOT a single hard-coded directory. On every request the
 *   plugin collects candidate roots, in priority order, and serves the first
 *   candidate that actually contains the requested file:
 *     1. explicit roots from `config.root` (string or string[]) or the
 *        `DSH_MEDIA_ROOT` env var (path list separated by `;`),
 *     2. every workspace currently registered with the DSH workspace registry
 *        (`workspaceRegistry.list()` → each `entity.path`), so on another
 *        machine it automatically follows whatever workspace is in use there.
 *   No candidate is required at startup; with nothing available requests just
 *   404, so the plugin never blocks boot because a path is missing.
 *
 * Security posture (see README):
 *   - GET/HEAD only; other methods -> 405.
 *   - The decoded relative path must not contain `..` and is confined to the
 *     matched root (path traversal -> 403/404).
 *   - Only known media/text extensions are served; everything else -> 404.
 *   - No directory listing.
 */

const name = 'dsh-media-serve'

/** Web services this plugin depends on. The workspace registry is OPTIONAL. */
const inject = ['webServer']

/** Media/text extensions this server is willing to expose. */
const ALLOWED = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.bmp', 'image/bmp'],
  ['.ico', 'image/x-icon'],
  ['.svg', 'image/svg+xml'],
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
])

/** Turn one scalar/list value into a trimmed string array. */
function asList(value) {
  if (value === undefined || value === null) return []
  const arr = Array.isArray(value) ? value : [value]
  const out = []
  for (const item of arr) {
    if (typeof item === 'string') {
      const t = item.trim()
      if (t !== '') out.push(t)
    }
  }
  return out
}

/** Read explicit roots from config + env (DSH_MEDIA_ROOT is a `;`-separated list). */
function explicitRoots(config, env) {
  const configured = asList(config?.root)
  const fromEnv = (env?.DSH_MEDIA_ROOT || '').split(';').map((s) => s.trim()).filter(Boolean)
  const combined = [...configured, ...fromEnv]
  return combined.map((p) => (isAbsolute(p) ? resolve(p) : resolve(process.cwd(), p)))
}

/** Current workspace paths from the optional DSH workspace registry (best-effort). */
function workspaceRoots(ctx) {
  try {
    const reg = ctx?.workspaceRegistry
    if (!reg || typeof reg.list !== 'function') return []
    const paths = []
    for (const ws of reg.list()) {
      if (ws && typeof ws.path === 'string' && ws.path.trim() !== '') paths.push(resolve(ws.path))
    }
    return paths
  } catch {
    // Registry not ready / unavailable at this moment — defer to explicit roots.
    return []
  }
}

/** Deduplicate while preserving order. */
function unique(list) {
  return [...new Set(list)]
}

/** Validate + normalize the request's relative path; returns null when unsafe. */
function safeRel(rawPath) {
  let rel = decodeURIComponent(rawPath.replace(/^\/media\/?/, ''))
  if (rel === '' || rel === '.') return null
  // Reject path-traversal segments and NUL bytes outright.
  for (const segment of rel.split(/[\\/]/)) {
    if (segment === '..' || segment === '' || segment.includes('\0')) return null
  }
  return rel
}

async function tryServe(root, rel, res) {
  const base = root.endsWith(sep) ? root : `${root}${sep}`
  const target = resolve(join(root, ...rel.split(/[\\/]/)))
  if (target !== root && !target.startsWith(base)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('forbidden')
    return true
  }
  try {
    const info = await stat(target)
    if (!info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('not found')
      return true
    }
    const body = await readFile(target)
    res.writeHead(200, {
      'content-type': ALLOWED.get(extname(target).toLowerCase()),
      'content-length': String(body.length),
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    })
    res.end(body)
    return true
  } catch {
    return false // file not under this root — try next root
  }
}

function apply(ctx, config) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/media',
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('method not allowed')
        return
      }
      const rawPath = new URL(req.url ?? '/', 'http://x').pathname
      const rel = safeRel(rawPath)
      if (rel === null) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('not found')
        return
      }
      const ext = extname(rel).toLowerCase()
      if (!ALLOWED.has(ext)) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('not an allowed media file')
        return
      }
      // Collect candidate roots fresh each request so workspaces added later are seen.
      const roots = unique([...explicitRoots(config, process.env), ...workspaceRoots(ctx)])
      for (const root of roots) {
        if (await tryServe(root, rel, res)) return
      }
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('not found')
    },
  }), 'dsh-media-serve: /media route')

  ctx.logger?.info?.(
    'dsh-media-serve active: explicit roots=%j at /media (workspace registry auto-detected per request)',
    explicitRoots(config, process.env),
  )
}

export { name, inject, apply }
