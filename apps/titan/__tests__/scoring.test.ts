import { describe, it, expect } from 'vitest'
import {
  calcAcademiaHealthScore,
  calcChurnScore,
  calcGraduationProgress,
  getNivel,
} from '../lib/scoring'

// ── calcAcademiaHealthScore ──────────────────────────────────────────────────
describe('calcAcademiaHealthScore', () => {
  it('returns 0 for empty academy', () => {
    expect(calcAcademiaHealthScore({
      totalAtletas: 0, atletasAtivos: 0, planosVencidos: 0, checkinsUltimos30d: 0,
    })).toBe(0)
  })

  it('returns 100 for perfect academy', () => {
    const score = calcAcademiaHealthScore({
      totalAtletas: 10,
      atletasAtivos: 10,
      planosVencidos: 0,
      checkinsUltimos30d: 80, // 10 * 8 = expected
      mediaCheckinsEsperada: 80,
    })
    expect(score).toBe(100)
  })

  it('penalises expired plans', () => {
    const healthy = calcAcademiaHealthScore({
      totalAtletas: 10, atletasAtivos: 10, planosVencidos: 0, checkinsUltimos30d: 80, mediaCheckinsEsperada: 80,
    })
    const sick = calcAcademiaHealthScore({
      totalAtletas: 10, atletasAtivos: 10, planosVencidos: 5, checkinsUltimos30d: 80, mediaCheckinsEsperada: 80,
    })
    expect(sick).toBeLessThan(healthy)
  })

  it('penalises low engagement', () => {
    const engaged = calcAcademiaHealthScore({
      totalAtletas: 10, atletasAtivos: 10, planosVencidos: 0, checkinsUltimos30d: 80, mediaCheckinsEsperada: 80,
    })
    const idle = calcAcademiaHealthScore({
      totalAtletas: 10, atletasAtivos: 10, planosVencidos: 0, checkinsUltimos30d: 0, mediaCheckinsEsperada: 80,
    })
    expect(idle).toBeLessThan(engaged)
  })

  it('clamps score between 0 and 100', () => {
    const score = calcAcademiaHealthScore({
      totalAtletas: 1, atletasAtivos: 0, planosVencidos: 1, checkinsUltimos30d: 0,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ── calcChurnScore ───────────────────────────────────────────────────────────
describe('calcChurnScore', () => {
  it('returns 0 for active recent athlete', () => {
    expect(calcChurnScore({
      diasSemCheckin: 0,
      planoVencido: false,
      totalCheckinsHistorico: 100,
    })).toBe(0)
  })

  it('returns high score for churned athlete', () => {
    const score = calcChurnScore({
      diasSemCheckin: 90,
      planoVencido: true,
      totalCheckinsHistorico: 1,
    })
    expect(score).toBe(100)
  })

  it('adds 30 pts for expired plan', () => {
    const without = calcChurnScore({ diasSemCheckin: 0, planoVencido: false, totalCheckinsHistorico: 10 })
    const with_ = calcChurnScore({ diasSemCheckin: 0, planoVencido: true, totalCheckinsHistorico: 10 })
    expect(with_ - without).toBe(30)
  })

  it('adds 20 pts for fewer than 4 total check-ins', () => {
    const low = calcChurnScore({ diasSemCheckin: 0, planoVencido: false, totalCheckinsHistorico: 2 })
    const normal = calcChurnScore({ diasSemCheckin: 0, planoVencido: false, totalCheckinsHistorico: 10 })
    expect(low - normal).toBe(20)
  })

  it('caps inactivity score at 50', () => {
    const a = calcChurnScore({ diasSemCheckin: 90, planoVencido: false, totalCheckinsHistorico: 10 })
    const b = calcChurnScore({ diasSemCheckin: 200, planoVencido: false, totalCheckinsHistorico: 10 })
    expect(a).toBe(b) // both cap at 50 pts inactivity
  })
})

// ── calcGraduationProgress ───────────────────────────────────────────────────
describe('calcGraduationProgress', () => {
  it('returns 0% with no activity', () => {
    const p = calcGraduationProgress({ kyuDanId: 5, checkinsDesdeGraduacao: 0, mesesDesdeGraduacao: 0 })
    expect(p.percentual).toBe(0)
    expect(p.pronto).toBe(false)
  })

  it('returns 100% and pronto=true when requirements met', () => {
    const req = { checkins: 50, meses: 6 } // kyu 5
    const p = calcGraduationProgress({
      kyuDanId: 5,
      checkinsDesdeGraduacao: req.checkins,
      mesesDesdeGraduacao: req.meses,
    })
    expect(p.percentual).toBe(100)
    expect(p.pronto).toBe(true)
  })

  it('returns pronto=false if only checkins met but not months', () => {
    const p = calcGraduationProgress({ kyuDanId: 5, checkinsDesdeGraduacao: 50, mesesDesdeGraduacao: 2 })
    expect(p.pronto).toBe(false)
  })

  it('returns 0 for unknown kyuDanId', () => {
    const p = calcGraduationProgress({ kyuDanId: 99, checkinsDesdeGraduacao: 100, mesesDesdeGraduacao: 24 })
    expect(p.percentual).toBe(0)
  })
})

// ── getNivel ─────────────────────────────────────────────────────────────────
describe('getNivel', () => {
  it('returns Iniciante for 0 pts', () => {
    expect(getNivel(0).label).toBe('Iniciante')
  })

  it('returns Bronze at 100 pts', () => {
    expect(getNivel(100).label).toBe('Bronze')
  })

  it('returns Diamante at 2000+ pts', () => {
    expect(getNivel(2000).label).toBe('Diamante')
    expect(getNivel(5000).label).toBe('Diamante')
  })

  it('returns progress 0 at tier start', () => {
    expect(getNivel(100).progress).toBe(0)
  })

  it('returns progress 50 at midpoint of tier', () => {
    // Bronze: 100–300, midpoint = 200
    expect(getNivel(200).progress).toBe(50)
  })

  it('returns progress 100 for Diamante (no next tier)', () => {
    expect(getNivel(9999).progress).toBe(100)
  })

  it('returns nextLabel for non-max tier', () => {
    expect(getNivel(0).nextLabel).toBe('Bronze')
    expect(getNivel(100).nextLabel).toBe('Prata')
  })

  it('returns null nextLabel for Diamante', () => {
    expect(getNivel(2000).nextLabel).toBeNull()
  })
})
