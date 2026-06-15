/**
 * Offline queue para PATCHes do scoring.
 *
 * Cenário: tatame perde wifi por 15s no meio de uma luta. Antes, o
 * sendAction simplesmente falhava silenciosamente e o árbitro perdia
 * o registro de uma ação (ex: waza-ari).
 *
 * Agora: PATCHes que falham são enfileirados em localStorage e re-enviados
 * quando a conexão volta. Ordem preservada (FIFO).
 *
 * Limitações conhecidas:
 *   - Se 2 tablets enfileiram ações conflitantes (mesmo match), a última
 *     fila a sincronizar sobrescreve. Em prática um tatame = um tablet.
 *   - Status visual no client mantém actions otimisticamente; se backend
 *     rejeitar quando sync, mostra warning.
 *   - Não persiste através de F5 do browser durante offline real-real
 *     (localStorage sim, mas a página de scoring perde estado). Aceitável.
 */

const QUEUE_KEY = 'titan_scoring_queue_v1'
const MAX_QUEUE_SIZE = 100

interface QueuedRequest {
  id: string
  url: string
  body: Record<string, unknown>
  enqueued_at: number
  attempts: number
}

function readQueue(): QueuedRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : []
  } catch {
    return []
  }
}

function writeQueue(q: QueuedRequest[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
  } catch {
    // Storage full: descarta os mais antigos
    if (q.length > 0) writeQueue(q.slice(-Math.floor(MAX_QUEUE_SIZE / 2)))
  }
}

export function enqueueScoringPatch(url: string, body: Record<string, unknown>) {
  const q = readQueue()
  q.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url,
    body,
    enqueued_at: Date.now(),
    attempts: 0,
  })
  // Limita tamanho da fila pra não estourar localStorage
  if (q.length > MAX_QUEUE_SIZE) q.shift()
  writeQueue(q)
}

export function getQueueSize(): number {
  return readQueue().length
}

/**
 * Tenta enviar todos os PATCHes pendentes em ordem FIFO.
 * Retorna estatísticas: sent, failed, removed (descartados após 5 tentativas).
 */
export async function flushQueue(): Promise<{ sent: number; failed: number; removed: number }> {
  const q = readQueue()
  if (q.length === 0) return { sent: 0, failed: 0, removed: 0 }

  let sent = 0
  let failed = 0
  let removed = 0
  const remaining: QueuedRequest[] = []

  for (const req of q) {
    try {
      const res = await fetch(req.url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      })
      if (res.ok) {
        sent++
      } else if (res.status >= 400 && res.status < 500) {
        // 4xx: erro permanente (ex: validação golden_score). Descarta.
        removed++
      } else {
        // 5xx ou network: re-enfileira
        req.attempts++
        if (req.attempts >= 5) removed++
        else { failed++; remaining.push(req) }
      }
    } catch {
      // Network error: re-enfileira
      req.attempts++
      if (req.attempts >= 5) removed++
      else { failed++; remaining.push(req) }
    }
  }

  writeQueue(remaining)
  return { sent, failed, removed }
}

/**
 * Tenta executar PATCH imediatamente; se falhar (offline ou 5xx), enfileira.
 * Retorna true se PATCH foi aceito pelo server agora, false se enfileirado.
 */
export async function patchWithFallback(
  url: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; queued: boolean; response?: Response }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueScoringPatch(url, body)
    return { ok: false, queued: true }
  }
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) return { ok: true, queued: false, response: res }
    // 4xx não vai melhorar com retry — devolve sem enfileirar
    if (res.status >= 400 && res.status < 500) return { ok: false, queued: false, response: res }
    // 5xx: enfileira pra retry
    enqueueScoringPatch(url, body)
    return { ok: false, queued: true, response: res }
  } catch {
    enqueueScoringPatch(url, body)
    return { ok: false, queued: true }
  }
}
