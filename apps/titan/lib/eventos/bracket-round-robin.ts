/**
 * bracket-round-robin.ts
 * Round Robin: every athlete fights every other athlete exactly once.
 * Ranking by: wins > score differential > head-to-head.
 */

import { Registration, Slot, Match } from './bracket-common'

export function generateRoundRobinBracket(registrations: Registration[]) {
  const n = registrations.length

  // Create slots (all in "round 1" conceptually — it's a pool)
  const slots: Slot[] = registrations.map((r, i) => ({
    rodada: 1,
    posicao: i,
    registration_id: r.id,
    is_bye: false,
    seed_number: i + 1,
  }))

  // Generate all pairings using circle method
  // For N athletes (pad to even with a BYE if odd)
  const athletes = [...registrations]
  const hasOddBye = n % 2 !== 0
  const paddedCount = hasOddBye ? n + 1 : n

  // Circle method: fix position 0, rotate the rest
  const rounds = paddedCount - 1
  const positions = Array.from({ length: paddedCount }, (_, i) => i)

  const matches: Match[] = []
  let matchNum = 1

  for (let round = 0; round < rounds; round++) {
    const matchesInRound = Math.floor(paddedCount / 2)

    for (let i = 0; i < matchesInRound; i++) {
      const home = positions[i]
      const away = positions[paddedCount - 1 - i]

      // Skip if either is the "phantom" BYE player
      if (hasOddBye && (home >= n || away >= n)) continue

      matches.push({
        rodada: round + 1,
        posicao: i,
        match_number: matchNum++,
        athlete1_registration_id: athletes[home].id,
        athlete2_registration_id: athletes[away].id,
        tipo: 'group',
        status: 'ready',
      })
    }

    // Rotate: keep position 0 fixed, shift the rest clockwise
    const last = positions.pop()!
    positions.splice(1, 0, last)
  }

  return {
    tipo: 'round_robin' as const,
    num_rodadas: rounds,
    slots,
    matches,
  }
}
