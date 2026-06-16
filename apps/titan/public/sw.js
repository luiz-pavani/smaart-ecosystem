/**
 * Titan service worker (v2).
 *
 * Estratégia:
 *   - Static assets (JS/CSS/fonts/images): cache-first com stale-while-revalidate.
 *   - HTML pages: network-first com fallback de cache em offline.
 *     Mantém último HTML válido pra que o tablet do árbitro volte da onde
 *     parou se a rede cair brevemente.
 *   - API e Supabase: sempre rede (network-only). Estado de scoring é
 *     gerenciado pela offline-queue.ts (PATCHes enfileirados em localStorage).
 */

const CACHE_NAME = 'titan-static-v2'
const HTML_CACHE_NAME = 'titan-html-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== HTML_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Apenas GET
  if (event.request.method !== 'GET') return

  // Pula API e Supabase
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.includes('supabase')) return

  // Cache-first pra static assets
  const isStatic = /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname)
  if (isStatic) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) {
          fetch(event.request).then((res) => {
            if (res.ok) cache.put(event.request, res.clone())
          }).catch(() => {})
          return cached
        }
        try {
          const res = await fetch(event.request)
          if (res.ok) cache.put(event.request, res.clone())
          return res
        } catch (err) {
          throw err
        }
      })
    )
    return
  }

  // Network-first com fallback de cache pra navegação HTML (mode='navigate')
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(event.request)
          if (fresh.ok) {
            const cache = await caches.open(HTML_CACHE_NAME)
            cache.put(event.request, fresh.clone())
          }
          return fresh
        } catch {
          // Offline ou erro de rede: tenta o último HTML cacheado da mesma URL.
          // Útil pro árbitro que perde conexão no meio da luta — o page shell
          // volta direto pra última versão vista, e a offline-queue cuida das
          // ações pendentes.
          const cached = await caches.match(event.request)
          if (cached) return cached
          // Sem cache da URL específica: tenta fallback genérico de qualquer
          // page de scoring (estrutura igual).
          const anyCached = await caches.match('/portal/eventos')
          if (anyCached) return anyCached
          throw new Error('Offline e sem cache pra esta página')
        }
      })()
    )
    return
  }
  // Demais requests: deixa o browser tratar
})
