/**
 * bracket-common.ts
 * Shared utilities for bracket generation: BYE placement, academy separation, seeding.
 */

export interface Registration {
  id: string
  atleta_id: string
  academia_id: string | null
  dados_atleta: Record<string, unknown>
  seed_number?: number
}

export interface Slot {
  rodada: number
  posicao: number
  registration_id: string | null
  is_bye: boolean
  seed_number: number | null
}

export interface Match {
  rodada: number
  posicao: number
  match_number: number
  athlete1_registration_id: string | null
  athlete2_registration_id: string | null
  tipo: string
  status: string
}

/** Round up to the next power of 2 */
export function nextPowerOf2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

/** Number of rounds for single elimination */
export function numRounds(n: number): number {
  return Math.ceil(Math.log2(n))
}

/**
 * Shuffle array (Fisher-Yates) — used for random seeding
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Academy separation: distribute athletes so same-academy athletes
 * are as far apart in the bracket as possible.
 *
 * Strategy: group by academy, sort groups by size DESC,
 * then interleave into two halves (top/bottom) alternating academies.
 */
export function separateByAcademy(registrations: Registration[]): Registration[] {
  // Group by academia
  const groups = new Map<string, Registration[]>()
  const noAcademy: Registration[] = []

  for (const r of registrations) {
    const key = r.academia_id || '__none__'
    if (key === '__none__') {
      noAcademy.push(r)
    } else {
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(r)
    }
  }

  // Sort groups by size DESC (largest academies first)
  const sorted = Array.from(groups.values()).sort((a, b) => b.length - a.length)

  // Interleave: alternate placing athletes in top half vs bottom half
  const topHalf: Registration[] = []
  const bottomHalf: Registration[] = []

  for (const group of sorted) {
    const shuffled = shuffle(group) // randomize within academy
    for (let i = 0; i < shuffled.length; i++) {
      // Alternate: first athlete top, second bottom, etc.
      if (i % 2 === 0) topHalf.push(shuffled[i])
      else bottomHalf.push(shuffled[i])
    }
  }

  // Athletes without academy go wherever has fewer
  for (const r of shuffle(noAcademy)) {
    if (topHalf.length <= bottomHalf.length) topHalf.push(r)
    else bottomHalf.push(r)
  }

  // Shuffle within each half to avoid predictability, then combine
  return [...shuffle(topHalf), ...shuffle(bottomHalf)]
}

/**
 * Place BYEs in proper positions for a single-elimination bracket.
 * Returns slots for round 1 with registrations and BYEs.
 *
 * Standard BYE placement: BYEs go to the strongest seeds.
 * For random seeding, BYEs are distributed evenly.
 */
export function placeFirstRoundWithByes(
  registrations: Registration[],
  bracketSize: number
): Slot[] {
  const numByes = bracketSize - registrations.length
  const slots: Slot[] = []

  // BYE positions: spread evenly across the bracket
  // Standard approach: BYEs occupy positions at the "bottom" of each half
  const byePositions = new Set<number>()

  if (numByes > 0) {
    // Place BYEs using standard seeding positions (reversed)
    // This ensures top seeds get BYEs
    const seedPositions = getStandardSeedPositions(bracketSize)
    for (let i = 0; i < numByes; i++) {
      // BYE goes opposite to the seed position (pair partner)
      const seedPos = seedPositions[i]
      const byePos = seedPos % 2 === 0 ? seedPos + 1 : seedPos - 1
      byePositions.add(byePos)
    }
  }

  let regIdx = 0
  for (let pos = 0; pos < bracketSize; pos++) {
    if (byePositions.has(pos)) {
      slots.push({
        rodada: 1,
        posicao: pos,
        registration_id: null,
        is_bye: true,
        seed_number: null,
      })
    } else {
      const reg = registrations[regIdx]
      slots.push({
        rodada: 1,
        posicao: pos,
        registration_id: reg?.id || null,
        is_bye: false,
        seed_number: regIdx + 1,
      })
      regIdx++
    }
  }

  return slots
}

/**
 * Standard seed positions for a bracket of given size.
 * Seed 1 at position 0, Seed 2 at bottom, etc.
 * Returns array where index = seed rank (0-based), value = position.
 */
function getStandardSeedPositions(bracketSize: number): number[] {
  if (bracketSize === 1) return [0]
  if (bracketSize === 2) return [0, 1]

  const positions: number[] = [0, 1]
  let step = 2

  while (positions.length < bracketSize) {
    const next: number[] = []
    for (const p of positions) {
      next.push(p * 2)
      next.push(p * 2 + 1)
    }
    positions.length = 0
    positions.push(...next)
    step *= 2
  }

  // Map: seed index → bracket position
  // Rearrange so that seed 1 is at top, seed 2 at bottom, 3/4 in quarters, etc.
  return generateSeedOrder(bracketSize)
}

function generateSeedOrder(size: number): number[] {
  if (size === 1) return [0]
  if (size === 2) return [0, 1]

  const prev = generateSeedOrder(size / 2)
  const result: number[] = []
  for (const p of prev) {
    result.push(p * 2)
    result.push(size - 1 - p * 2)
  }
  return result
}

/**
 * Generate matches for remaining rounds of a single-elimination bracket.
 * Round 1 matches come from slots; subsequent rounds have TBD athletes.
 */
export function generateEliminationMatches(
  bracketSize: number,
  slots: Slot[],
  startMatchNumber: number = 1
): Match[] {
  const matches: Match[] = []
  const totalRounds = numRounds(bracketSize)
  let matchNum = startMatchNumber

  // Round 1: pair up slots
  const r1Matches = bracketSize / 2
  for (let pos = 0; pos < r1Matches; pos++) {
    const s1 = slots[pos * 2]
    const s2 = slots[pos * 2 + 1]

    const isBye = s1.is_bye || s2.is_bye
    const winner = isBye
      ? (s1.is_bye ? s2.registration_id : s1.registration_id)
      : null

    matches.push({
      rodada: 1,
      posicao: pos,
      match_number: matchNum++,
      athlete1_registration_id: s1.registration_id,
      athlete2_registration_id: s2.registration_id,
      tipo: totalRounds === 1 ? 'final' : 'main',
      status: isBye ? 'walkover' : (s1.registration_id && s2.registration_id ? 'ready' : 'pending'),
    })
  }

  // Subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round)
    for (let pos = 0; pos < matchesInRound; pos++) {
      // Check if both feeder matches are walkovers (BYE propagation)
      const feeder1 = matches.find(m => m.rodada === round - 1 && m.posicao === pos * 2)
      const feeder2 = matches.find(m => m.rodada === round - 1 && m.posicao === pos * 2 + 1)

      let a1: string | null = null
      let a2: string | null = null
      let status = 'pending'

      // Propagate BYE winners
      if (feeder1?.status === 'walkover') {
        a1 = feeder1.athlete1_registration_id && !slots.find(s => s.rodada === 1 && s.posicao === feeder1.posicao * 2 && s.is_bye)
          ? feeder1.athlete1_registration_id
          : feeder1.athlete2_registration_id
      }
      if (feeder2?.status === 'walkover') {
        a2 = feeder2.athlete1_registration_id && !slots.find(s => s.rodada === 1 && s.posicao === feeder2.posicao * 2 && s.is_bye)
          ? feeder2.athlete1_registration_id
          : feeder2.athlete2_registration_id
      }

      if (a1 && a2) status = 'ready'

      const tipo = round === totalRounds
        ? 'final'
        : round === totalRounds - 1 && totalRounds >= 3
          ? 'semifinal'
          : 'main'

      matches.push({
        rodada: round,
        posicao: pos,
        match_number: matchNum++,
        athlete1_registration_id: a1,
        athlete2_registration_id: a2,
        tipo,
        status,
      })
    }
  }

  return matches
}

/**
 * Resolve BYE walkover: get the non-BYE athlete from a walkover match.
 */
export function getWalkoverWinner(match: Match, slots: Slot[]): string | null {
  if (match.status !== 'walkover') return null
  const s1 = slots.find(s => s.rodada === 1 && s.posicao === match.posicao * 2)
  const s2 = slots.find(s => s.rodada === 1 && s.posicao === match.posicao * 2 + 1)
  if (s1?.is_bye) return s2?.registration_id || null
  if (s2?.is_bye) return s1?.registration_id || null
  return null
}
