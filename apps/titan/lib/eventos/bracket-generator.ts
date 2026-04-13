/**
 * bracket-generator.ts
 * Factory that delegates to the correct bracket algorithm.
 * Also contains single_elimination and single_elimination_bronze.
 */

import {
  Registration, Slot, Match,
  nextPowerOf2, numRounds, shuffle,
  separateByAcademy, placeFirstRoundWithByes, generateEliminationMatches,
} from './bracket-common'
import { generateRepechageBracket } from './bracket-repechage'
import { generateDoubleEliminationBracket } from './bracket-double-elimination'
import { generateRoundRobinBracket } from './bracket-round-robin'
import { generateGroupStageBracket } from './bracket-group-stage'

export type BracketType =
  | 'single_elimination'
  | 'single_elimination_bronze'
  | 'single_elimination_repechage'
  | 'double_elimination'
  | 'round_robin'
  | 'group_stage_elimination'
  | 'best_of_3'

export interface BracketConfig {
  academy_separation?: boolean
  group_size?: number
  advance_count?: number
  seed_method?: 'random' | 'manual' | 'ranking'
}

export interface GeneratedBracket {
  tipo: BracketType
  num_rodadas: number
  slots: Slot[]
  matches: Match[]
}

/**
 * Bracket rule: maps athlete count ranges to bracket types.
 * Stored in evento.config.bracket_rules
 */
export interface BracketRule {
  min: number
  max: number
  tipo: BracketType | 'gold_medal'
  label?: string
}

/** Default rules inspired by Smoothcomp / IJF standard */
export const DEFAULT_BRACKET_RULES: BracketRule[] = [
  { min: 1, max: 1, tipo: 'gold_medal', label: 'Medalha de ouro direta' },
  { min: 2, max: 2, tipo: 'best_of_3', label: 'Melhor de 3' },
  { min: 3, max: 4, tipo: 'round_robin', label: 'Todos contra todos' },
  { min: 5, max: 8, tipo: 'single_elimination_repechage', label: 'Eliminatória com repescagem (2 bronzes)' },
  { min: 9, max: 999, tipo: 'single_elimination_repechage', label: 'Eliminatória com repescagem (2 bronzes)' },
]

/**
 * Resolve which bracket type to use based on athlete count and rules.
 * Returns null for gold_medal (1 athlete, no bracket needed).
 */
export function resolveBracketType(
  athleteCount: number,
  rules?: BracketRule[]
): BracketType | 'gold_medal' {
  const r = (rules || DEFAULT_BRACKET_RULES)
    .find(rule => athleteCount >= rule.min && athleteCount <= rule.max)
  return r?.tipo ?? 'single_elimination_repechage'
}

/**
 * Main factory: generate a bracket of the given type.
 */
export function generateBracket(
  tipo: BracketType,
  registrations: Registration[],
  config: BracketConfig = {}
): GeneratedBracket {
  if (registrations.length < 2) {
    throw new Error('Minimo de 2 atletas para gerar chave')
  }

  // Apply academy separation if enabled (default: true)
  const separated = config.academy_separation !== false
    ? separateByAcademy(registrations)
    : shuffle(registrations)

  switch (tipo) {
    case 'best_of_3':
      return generateBestOf3(separated)
    case 'single_elimination':
      return generateSingleElimination(separated, false)
    case 'single_elimination_bronze':
      return generateSingleElimination(separated, true)
    case 'single_elimination_repechage':
      return generateRepechageBracket(separated)
    case 'double_elimination':
      return generateDoubleEliminationBracket(separated)
    case 'round_robin':
      return generateRoundRobinBracket(separated)
    case 'group_stage_elimination':
      return generateGroupStageBracket(separated, config)
    default:
      throw new Error(`Tipo de chave nao suportado: ${tipo}`)
  }
}

/**
 * Single Elimination (with optional bronze match)
 */
function generateSingleElimination(
  registrations: Registration[],
  withBronze: boolean
): GeneratedBracket {
  const n = registrations.length
  const bracketSize = nextPowerOf2(n)
  const totalRounds = numRounds(bracketSize)

  // Place first round slots with BYEs
  const slots = placeFirstRoundWithByes(registrations, bracketSize)

  // Generate matches
  const matches = generateEliminationMatches(bracketSize, slots)

  // Add bronze match if requested (losers of semifinals)
  // Bronze must come BEFORE the final — the final is always the last match
  if (withBronze && totalRounds >= 2) {
    const finalMatch = matches.find(m => m.tipo === 'final')
    const nonFinal = matches.filter(m => m.tipo !== 'final')
    const bronzeMatch: Match = {
      rodada: totalRounds,
      posicao: 1,
      match_number: 0, // will be renumbered
      athlete1_registration_id: null,
      athlete2_registration_id: null,
      tipo: 'bronze',
      status: 'pending',
    }
    const allOrdered = [...nonFinal, bronzeMatch, ...(finalMatch ? [finalMatch] : [])]
    allOrdered.forEach((m, i) => { m.match_number = i + 1 })
    matches.length = 0
    matches.push(...allOrdered)
  }

  return {
    tipo: withBronze ? 'single_elimination_bronze' : 'single_elimination',
    num_rodadas: totalRounds,
    slots,
    matches,
  }
}

/**
 * Best of 3: exactly 2 athletes, 3 matches (same pair).
 * Winner is whoever wins 2 out of 3.
 */
function generateBestOf3(registrations: Registration[]): GeneratedBracket {
  if (registrations.length !== 2) {
    throw new Error('Best of 3 requer exatamente 2 atletas')
  }

  const [a, b] = registrations
  const slots: Slot[] = [
    { rodada: 1, posicao: 0, registration_id: a.id, is_bye: false, seed_number: 1 },
    { rodada: 1, posicao: 1, registration_id: b.id, is_bye: false, seed_number: 2 },
  ]

  const matches: Match[] = [
    {
      rodada: 1, posicao: 0, match_number: 1,
      athlete1_registration_id: a.id,
      athlete2_registration_id: b.id,
      tipo: 'main', status: 'ready',
    },
    {
      rodada: 2, posicao: 0, match_number: 2,
      athlete1_registration_id: a.id,
      athlete2_registration_id: b.id,
      tipo: 'main', status: 'pending',
    },
    {
      rodada: 3, posicao: 0, match_number: 3,
      athlete1_registration_id: a.id,
      athlete2_registration_id: b.id,
      tipo: 'final', status: 'pending',
    },
  ]

  return { tipo: 'best_of_3', num_rodadas: 3, slots, matches }
}
