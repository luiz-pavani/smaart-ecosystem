/**
 * bracket-group-stage.ts
 * Group Stage + Elimination: divide athletes into groups (round robin),
 * top N from each group advance to a single-elimination bracket.
 */

import {
  Registration, Slot, Match,
  nextPowerOf2, numRounds, shuffle,
  placeFirstRoundWithByes, generateEliminationMatches,
} from './bracket-common'
import { BracketConfig } from './bracket-generator'

export function generateGroupStageBracket(
  registrations: Registration[],
  config: BracketConfig = {}
) {
  const groupSize = config.group_size || 4
  const advanceCount = config.advance_count || 2
  const n = registrations.length
  const numGroups = Math.ceil(n / groupSize)

  // Distribute athletes into groups (snake draft for balance)
  const groups: Registration[][] = Array.from({ length: numGroups }, () => [])
  const shuffled = shuffle(registrations)

  for (let i = 0; i < shuffled.length; i++) {
    const row = Math.floor(i / numGroups)
    const col = row % 2 === 0 ? i % numGroups : numGroups - 1 - (i % numGroups)
    groups[col].push(shuffled[i])
  }

  // Create slots for all athletes
  const slots: Slot[] = []
  let slotPos = 0
  for (const group of groups) {
    for (const r of group) {
      slots.push({
        rodada: 1,
        posicao: slotPos++,
        registration_id: r.id,
        is_bye: false,
        seed_number: slotPos,
      })
    }
  }

  // Generate group stage matches (round robin within each group)
  const matches: Match[] = []
  let matchNum = 1
  let groupIndex = 0

  for (const group of groups) {
    const gn = group.length
    const groupLabel = groupIndex++

    // All pairings within group
    for (let i = 0; i < gn; i++) {
      for (let j = i + 1; j < gn; j++) {
        matches.push({
          rodada: 1, // All group matches are "round 1" conceptually
          posicao: 1000 + groupLabel * 100 + matchNum, // offset for group stage
          match_number: matchNum++,
          athlete1_registration_id: group[i].id,
          athlete2_registration_id: group[j].id,
          tipo: 'group',
          status: 'ready',
        })
      }
    }
  }

  // Elimination phase placeholder matches
  // Total advancing: numGroups * advanceCount
  const totalAdvancing = numGroups * advanceCount
  const elimBracketSize = nextPowerOf2(totalAdvancing)
  const elimRounds = numRounds(elimBracketSize)
  const elimMatchCount = elimBracketSize - 1

  // Create placeholder elimination matches
  for (let round = 1; round <= elimRounds; round++) {
    const matchesInRound = elimBracketSize / Math.pow(2, round)
    for (let pos = 0; pos < matchesInRound; pos++) {
      const tipo = round === elimRounds
        ? 'final'
        : round === elimRounds - 1 && elimRounds >= 3
          ? 'semifinal'
          : 'main'

      matches.push({
        rodada: round + 1, // +1 because round 1 is group stage
        posicao: pos,
        match_number: matchNum++,
        athlete1_registration_id: null,
        athlete2_registration_id: null,
        tipo,
        status: 'pending',
      })
    }
  }

  return {
    tipo: 'group_stage_elimination' as const,
    num_rodadas: 1 + elimRounds, // group stage + elimination rounds
    slots,
    matches,
  }
}
