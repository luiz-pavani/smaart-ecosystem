/**
 * Pure business logic for scoring, health metrics, and graduation progress.
 * No I/O, no Supabase — safe to unit-test.
 */

// ── Academia Health Score ────────────────────────────────────────────────────

export interface AcademiaHealthInput {
  totalAtletas: number
  atletasAtivos: number
  planosVencidos: number
  checkinsUltimos30d: number
  mediaCheckinsEsperada?: number // default: totalAtletas * 8
}

/**
 * Returns a 0–100 health score for an academy.
 * Components:
 *  - Active ratio (40 pts): % atletas com status ativo
 *  - Payment health (30 pts): % atletas sem plano vencido
 *  - Engagement (30 pts): check-ins vs expected baseline
 */
export function calcAcademiaHealthScore(input: AcademiaHealthInput): number {
  const { totalAtletas, atletasAtivos, planosVencidos, checkinsUltimos30d } = input
  if (totalAtletas === 0) return 0

  const activeRatio = atletasAtivos / totalAtletas
  const paymentHealth = Math.max(0, totalAtletas - planosVencidos) / totalAtletas
  const expectedCheckins = input.mediaCheckinsEsperada ?? totalAtletas * 8
  const engagementRatio = expectedCheckins > 0
    ? Math.min(1, checkinsUltimos30d / expectedCheckins)
    : 0

  const score = activeRatio * 40 + paymentHealth * 30 + engagementRatio * 30
  return Math.round(Math.min(100, Math.max(0, score)))
}

// ── Churn Score ──────────────────────────────────────────────────────────────

export interface ChurnInput {
  diasSemCheckin: number
  planoVencido: boolean
  totalCheckinsHistorico: number
}

/**
 * Returns a 0–100 churn risk score (higher = more likely to churn).
 * Components:
 *  - Inactivity (50 pts): days without check-in (caps at 90d)
 *  - Expired plan (30 pts): binary
 *  - Low engagement history (20 pts): < 4 total check-ins ever
 */
export function calcChurnScore(input: ChurnInput): number {
  const inactivityScore = Math.min(50, (input.diasSemCheckin / 90) * 50)
  const planScore = input.planoVencido ? 30 : 0
  const historyScore = input.totalCheckinsHistorico < 4 ? 20 : 0

  return Math.round(Math.min(100, inactivityScore + planScore + historyScore))
}

// ── Graduation Progress ──────────────────────────────────────────────────────

export interface GraduationProgressInput {
  kyuDanId: number
  checkinsDesdeGraduacao: number
  mesesDesdeGraduacao: number
}

export interface GraduationProgress {
  percentual: number
  checkinsNecessarios: number
  mesesNecessarios: number
  pronto: boolean
}

// Minimum check-ins and months required per kyu/dan level (ids 1-22)
const REQUIREMENTS: Record<number, { checkins: number; meses: number }> = {
  1:  { checkins: 20,  meses: 3  },  // Branca
  2:  { checkins: 30,  meses: 4  },  // Branca-Cinza
  3:  { checkins: 40,  meses: 5  },  // Cinza
  4:  { checkins: 40,  meses: 6  },  // Cinza-Azul
  5:  { checkins: 50,  meses: 6  },  // Azul
  6:  { checkins: 50,  meses: 8  },  // Azul-Laranja
  7:  { checkins: 60,  meses: 8  },  // Laranja
  8:  { checkins: 60,  meses: 10 },  // Laranja-Verde
  9:  { checkins: 70,  meses: 10 },  // Verde
  10: { checkins: 70,  meses: 12 },  // Verde (adulto)
  11: { checkins: 80,  meses: 12 },  // Verde-Azul (adulto)
  12: { checkins: 100, meses: 18 },  // Azul (adulto)
  // Dans (black belt)
  13: { checkins: 150, meses: 24 },  // 1º Dan
  14: { checkins: 200, meses: 36 },  // 2º Dan
  15: { checkins: 240, meses: 48 },  // 3º Dan
  16: { checkins: 280, meses: 60 },  // 4º Dan
  17: { checkins: 320, meses: 72 },  // 5º Dan
  18: { checkins: 0,   meses: 84 },  // 6º Dan (federation decision)
  19: { checkins: 0,   meses: 96 },  // 7º Dan
  20: { checkins: 0,   meses: 120 }, // 8º Dan
  21: { checkins: 0,   meses: 144 }, // 9º Dan
  22: { checkins: 0,   meses: 180 }, // 10º Dan
}

/**
 * Returns progress toward the next graduation.
 * Returns percentual=100 for dans >= 18 (federation discretion).
 */
export function calcGraduationProgress(input: GraduationProgressInput): GraduationProgress {
  const req = REQUIREMENTS[input.kyuDanId]
  if (!req) return { percentual: 0, checkinsNecessarios: 0, mesesNecessarios: 0, pronto: false }

  if (req.checkins === 0 && req.meses === 0) {
    return { percentual: 100, checkinsNecessarios: 0, mesesNecessarios: 0, pronto: true }
  }

  const checkinsOk = req.checkins === 0 || input.checkinsDesdeGraduacao >= req.checkins
  const mesesOk = req.meses === 0 || input.mesesDesdeGraduacao >= req.meses

  const checkinsProgress = req.checkins > 0
    ? Math.min(1, input.checkinsDesdeGraduacao / req.checkins)
    : 1
  const mesesProgress = req.meses > 0
    ? Math.min(1, input.mesesDesdeGraduacao / req.meses)
    : 1

  const percentual = Math.round(((checkinsProgress + mesesProgress) / 2) * 100)

  return {
    percentual,
    checkinsNecessarios: req.checkins,
    mesesNecessarios: req.meses,
    pronto: checkinsOk && mesesOk,
  }
}

// ── Pontos / Level ───────────────────────────────────────────────────────────

export const NIVEL_LABELS = [
  { min: 0,    label: 'Iniciante',  color: 'text-gray-400' },
  { min: 100,  label: 'Bronze',     color: 'text-amber-700' },
  { min: 300,  label: 'Prata',      color: 'text-gray-300' },
  { min: 600,  label: 'Ouro',       color: 'text-yellow-400' },
  { min: 1000, label: 'Platina',    color: 'text-cyan-300' },
  { min: 2000, label: 'Diamante',   color: 'text-blue-400' },
] as const

export interface NivelInfo {
  label: string
  color: string
  progress: number
  nextLabel: string | null
  nextMin: number | null
}

export function getNivel(pts: number): NivelInfo {
  let idx = 0
  for (let i = 0; i < NIVEL_LABELS.length; i++) {
    if (pts >= NIVEL_LABELS[i].min) idx = i
  }
  const nivel = NIVEL_LABELS[idx]
  const next = NIVEL_LABELS[idx + 1] ?? null
  const progress = next
    ? ((pts - nivel.min) / (next.min - nivel.min)) * 100
    : 100

  return {
    label: nivel.label,
    color: nivel.color,
    progress: Math.min(100, Math.max(0, progress)),
    nextLabel: next?.label ?? null,
    nextMin: next?.min ?? null,
  }
}
