/**
 * Utilities for judo belt graduation display and formatting
 */

// Dan levels mapping to numbers
const DAN_MAPPING: Record<string, number> = {
  SHODAN: 1,
  NIDAN: 2,
  SANDAN: 3,
  YONDAN: 4,
  GODAN: 5,
  ROKUDAN: 6,
  NANADAN: 7,
  HACHIDAN: 8,
  KYUDAN: 9,
  JUDAN: 10,
}

// Graduation list in order
const GRADUATIONS = [
  'BRANCA',
  'BRANCA/CINZA',
  'CINZA',
  'CINZA/AZUL',
  'AZUL',
  'AZUL/AMARELA',
  'AMARELA',
  'AMARELA/LARANJA',
  'LARANJA',
  'VERDE',
  'ROXA',
  'MARROM',
  'PRETA',
  'VERMELHA/BRANCA',
  'VERMELHA',
]

/**
 * Get color classes for a graduation/belt
 * Returns tailwind classes for background and text color
 */
export function getBeltColorClasses(graduacao: string): string {
  const grad = extractGraduationName(graduacao).toUpperCase()

  if (grad.includes('BRANCA')) return 'bg-white text-black border border-gray-300'
  if (grad.includes('CINZA')) return 'bg-gray-400 text-white'
  if (grad.includes('AZUL')) return 'bg-blue-500 text-white'
  if (grad.includes('AMARELA')) return 'bg-yellow-400 text-black'
  if (grad.includes('LARANJA')) return 'bg-orange-500 text-white'
  if (grad.includes('VERDE')) return 'bg-green-500 text-white'
  if (grad.includes('ROXA')) return 'bg-purple-500 text-white'
  if (grad.includes('MARROM')) return 'bg-amber-700 text-white'
  if (grad.includes('PRETA') || grad.includes('YUDANSHA')) return 'bg-black text-white'
  if (grad.includes('VERMELHA')) return 'bg-red-600 text-white'

  return 'bg-gray-200 text-gray-700'
}

/**
 * Extract graduation name from the database format
 * e.g., "FAIXA BRANCA|MÚKYŪ" -> "BRANCA"
 */
export function extractGraduationName(graduacao: string): string {
  if (!graduacao) return ''
  
  // Get the part before the pipe
  const parts = graduacao.split('|')
  const beltPart = parts[0].trim()
  
  // Extract the color name (last word)
  const words = beltPart.split(' ')
  return words[words.length - 1]
}

/**
 * Get display text for graduation with dan number if applicable
 * Examples:
 * - "BRANCA|MÚKYŪ" -> "Branca"
 * - "FAIXA PRETA|YUDANSHA" with dan_nivel "SHODAN" -> "Preta 1"
 * - "VERMELHA/BRANCA|ROKUDAN" with dan_nivel "ROKUDAN" -> "Vermelha/Branca 6"
 */
export function getGraduationDisplayText(
  graduacao: string,
  danNivel?: string | null
): string {
  const grad = extractGraduationName(graduacao)
  
  // Format graduation name (capitalize first letter, lowercase rest)
  const formattedGrad = grad
    .toLowerCase()
    .split('/')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('/')

  // If has dan level, append the number
  if (danNivel) {
    const danNumber = DAN_MAPPING[danNivel.toUpperCase()]
    if (danNumber) {
      return `${formattedGrad} ${danNumber}`
    }
  }

  return formattedGrad
}

/**
 * Get tooltip/title for graduation display
 */
export function getGraduationTooltip(
  graduacao: string,
  danNivel?: string | null
): string {
  const grad = extractGraduationName(graduacao)
  
  if (danNivel && (grad.includes('PRETA') || grad.includes('VERMELHA'))) {
    return `${grad} - ${danNivel}`
  }
  
  return grad
}

/**
 * Get sequential index of graduation (for filtering/sorting)
 */
export function getGraduationIndex(graduacao: string): number {
  const grad = extractGraduationName(graduacao).toUpperCase()
  
  for (let i = 0; i < GRADUATIONS.length; i++) {
    if (GRADUATIONS[i].includes(grad)) {
      return i
    }
  }
  
  return -1
}
