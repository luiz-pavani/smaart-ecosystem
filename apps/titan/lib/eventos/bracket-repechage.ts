/**
 * bracket-repechage.ts
 * IJF-style repechage: single elimination main bracket + 2 repechage brackets
 * producing 2 bronze medals.
 *
 * How it works:
 * - Main bracket: standard single elimination to final
 * - After semifinals: losers of each side of the bracket enter repechage
 * - Repechage A: all losers from the side of semifinalist A, fight from bottom up
 * - Repechage B: same for side B
 * - Winner of each repechage fights the semifinal loser from the opposite side for bronze
 *
 * Simplified for implementation:
 * - 2 bronze matches (standard IJF)
 * - Repechage starts from quarterfinal losers feeding into repechage rounds
 */

import {
  Registration, Slot, Match,
  nextPowerOf2, numRounds,
  placeFirstRoundWithByes, generateEliminationMatches,
} from './bracket-common'

export function generateRepechageBracket(registrations: Registration[]) {
  const n = registrations.length
  const bracketSize = nextPowerOf2(n)
  const totalRounds = numRounds(bracketSize)

  // Place first round
  const slots = placeFirstRoundWithByes(registrations, bracketSize)

  // Generate main bracket matches
  const mainMatches = generateEliminationMatches(bracketSize, slots)
  let maxMatchNum = Math.max(...mainMatches.map(m => m.match_number))

  const repechageMatches: Match[] = []

  // Only add repechage if we have at least semifinals (3+ rounds)
  if (totalRounds >= 3) {
    // For IJF repechage, we need:
    // - Repechage matches for losers feeding into bronze matches
    // - Bronze match 1: winner of repechage A vs loser of semifinal B
    // - Bronze match 2: winner of repechage B vs loser of semifinal A

    // For a standard 8-person bracket (3 rounds):
    // QF losers enter repechage, then fight semifinal losers
    // For 16-person: R1 losers from each side feed into repechage chain

    // Simplified: create repechage rounds from quarterfinals onward
    // Number of repechage rounds = totalRounds - 2 (from QF to bronze)
    const repRounds = totalRounds - 2

    // Repechage A (top half losers)
    for (let r = 1; r <= repRounds; r++) {
      repechageMatches.push({
        rodada: r,
        posicao: 100 + r, // offset to distinguish from main bracket
        match_number: ++maxMatchNum,
        athlete1_registration_id: null,
        athlete2_registration_id: null,
        tipo: 'repechage',
        status: 'pending',
      })
    }

    // Repechage B (bottom half losers)
    for (let r = 1; r <= repRounds; r++) {
      repechageMatches.push({
        rodada: r,
        posicao: 200 + r, // offset for repechage B
        match_number: ++maxMatchNum,
        athlete1_registration_id: null,
        athlete2_registration_id: null,
        tipo: 'repechage',
        status: 'pending',
      })
    }

    // Bronze match 1 (winner repechage A vs loser semifinal B)
    repechageMatches.push({
      rodada: totalRounds,
      posicao: 101,
      match_number: ++maxMatchNum,
      athlete1_registration_id: null,
      athlete2_registration_id: null,
      tipo: 'bronze',
      status: 'pending',
    })

    // Bronze match 2 (winner repechage B vs loser semifinal A)
    repechageMatches.push({
      rodada: totalRounds,
      posicao: 201,
      match_number: ++maxMatchNum,
      athlete1_registration_id: null,
      athlete2_registration_id: null,
      tipo: 'bronze',
      status: 'pending',
    })
  } else if (totalRounds === 2) {
    // Only 4 athletes: no repechage, just 1 bronze match
    repechageMatches.push({
      rodada: totalRounds,
      posicao: 1,
      match_number: ++maxMatchNum,
      athlete1_registration_id: null,
      athlete2_registration_id: null,
      tipo: 'bronze',
      status: 'pending',
    })
  }

  // Reorder matches so bronze/repechage come BEFORE the final.
  // The final must always be the last match of the bracket.
  const finalMatch = mainMatches.find(m => m.tipo === 'final')
  const nonFinalMain = mainMatches.filter(m => m.tipo !== 'final')
  const allOrdered = [...nonFinalMain, ...repechageMatches, ...(finalMatch ? [finalMatch] : [])]

  // Renumber match_number sequentially
  allOrdered.forEach((m, i) => { m.match_number = i + 1 })

  return {
    tipo: 'single_elimination_repechage' as const,
    num_rodadas: totalRounds,
    slots,
    matches: allOrdered,
  }
}
