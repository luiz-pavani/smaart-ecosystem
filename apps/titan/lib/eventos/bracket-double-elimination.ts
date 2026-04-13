/**
 * bracket-double-elimination.ts
 * Double elimination bracket: winners bracket + losers bracket + grand final.
 * Athlete must lose twice to be eliminated.
 */

import {
  Registration, Slot, Match,
  nextPowerOf2, numRounds,
  placeFirstRoundWithByes, generateEliminationMatches,
} from './bracket-common'

export function generateDoubleEliminationBracket(registrations: Registration[]) {
  const n = registrations.length
  const bracketSize = nextPowerOf2(n)
  const winnersRounds = numRounds(bracketSize)

  // Winners bracket slots and matches
  const slots = placeFirstRoundWithByes(registrations, bracketSize)
  const winnersMatches = generateEliminationMatches(bracketSize, slots)

  // Mark winners final as semifinal (not final yet — grand final comes after)
  const winnersFinal = winnersMatches.find(m => m.tipo === 'final')
  if (winnersFinal) winnersFinal.tipo = 'main'

  let maxMatchNum = Math.max(...winnersMatches.map(m => m.match_number))

  // Losers bracket
  // Losers bracket has (2 * winnersRounds - 1) rounds:
  // - Each winners round feeds losers into a new losers round
  // - Losers rounds alternate between "drop-down" rounds (new losers enter)
  //   and "internal" rounds (losers fight each other)
  const losersMatches: Match[] = []
  const losersRounds = 2 * (winnersRounds - 1)

  // Calculate matches per losers round
  let losersMatchesInRound = bracketSize / 4 // First losers round: half of first winners round losers

  for (let r = 1; r <= losersRounds; r++) {
    const matchCount = Math.max(1, Math.ceil(losersMatchesInRound))

    for (let pos = 0; pos < matchCount; pos++) {
      losersMatches.push({
        rodada: r,
        posicao: 300 + r * 100 + pos, // 300+ offset for losers bracket
        match_number: ++maxMatchNum,
        athlete1_registration_id: null,
        athlete2_registration_id: null,
        tipo: 'losers',
        status: 'pending',
      })
    }

    // Odd rounds: same count (drop-down), Even rounds: halve (internal elimination)
    if (r % 2 === 0) {
      losersMatchesInRound /= 2
    }
  }

  // Grand final: winner of winners bracket vs winner of losers bracket
  const grandFinal: Match = {
    rodada: winnersRounds + 1,
    posicao: 0,
    match_number: ++maxMatchNum,
    athlete1_registration_id: null, // winners bracket champion
    athlete2_registration_id: null, // losers bracket champion
    tipo: 'grand_final',
    status: 'pending',
  }

  return {
    tipo: 'double_elimination' as const,
    num_rodadas: winnersRounds + 1, // +1 for grand final
    slots,
    matches: [...winnersMatches, ...losersMatches, grandFinal],
  }
}
