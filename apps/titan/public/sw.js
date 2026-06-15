/**
 * Titan service worker.
 *
 * Estratégia conservadora:
 *   - Cacheia static assets (CSS, JS, fonts, images) com cache-first.
 *   - API e HTML pages: sempre rede (network-only). Não tentamos servir
 *     páginas stale — risco de mostrar dados de evento errados.
 *   - Offline detection é responsabilidade do app (navigator.onLine + retry
 *     queue do scoring). O SW só ajuda com carregamento estático rápido.
 */

const CACHE_NAME = 'titan-static-v1'

self.addEventListener('install', (event) => {
  // Take over immediately
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Pula tudo que não é GET (POST/PATCH/DELETE de API não pode ser cacheado).
  if (event.request.method !== 'GET') return

  // Pula API e Supabase realtime
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.includes('supabase')) return

  // Cache-first apenas para static assets (extensões conhecidas)
  const isStatic = /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname)
  if (!isStatic) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request)
      if (cached) {
        // Stale-while-revalidate
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
        // Sem cache + sem rede → deixa o browser tratar
        throw err
      }
    })
  )
})
