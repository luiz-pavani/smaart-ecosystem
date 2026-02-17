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

// Graduation colors mapping (RGB values for oval badges)
const GRADUATION_COLORS: Record<string, { bg: string; text: string; rgb: string }> = {
  BRANCA: { bg: 'bg-white', text: 'text-black', rgb: 'rgb(255, 255, 255)' },
  CINZA: { bg: 'bg-gray-400', text: 'text-white', rgb: 'rgb(156, 163, 175)' },
  AZUL: { bg: 'bg-blue-500', text: 'text-white', rgb: 'rgb(59, 130, 246)' },
  AMARELA: { bg: 'bg-yellow-400', text: 'text-black', rgb: 'rgb(250, 204, 21)' },
  LARANJA: { bg: 'bg-orange-500', text: 'text-white', rgb: 'rgb(249, 115, 22)' },
  VERDE: { bg: 'bg-green-500', text: 'text-white', rgb: 'rgb(34, 197, 94)' },
  ROXA: { bg: 'bg-purple-500', text: 'text-white', rgb: 'rgb(168, 85, 247)' },
  MARROM: { bg: 'bg-amber-700', text: 'text-white', rgb: 'rgb(180, 83, 9)' },
  PRETA: { bg: 'bg-black', text: 'text-white', rgb: 'rgb(0, 0, 0)' },
  VERMELHA: { bg: 'bg-red-600', text: 'text-white', rgb: 'rgb(220, 38, 38)' },
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
 * Get color info for a graduation/belt
 */
export function getGraduationColor(graduacao: string): { bg: string; text: string; rgb: string } {
  const grad = extractGraduationName(graduacao).toUpperCase()

  for (const [key, value] of Object.entries(GRADUATION_COLORS)) {
    if (grad.includes(key)) {
      return value
    }
  }

  return { bg: 'bg-gray-200', text: 'text-gray-700', rgb: 'rgb(229, 231, 235)' }
}

/**
 * Get color classes for a graduation/belt (legacy support)
 * Returns tailwind classes for background and text color
 */
export function getBeltColorClasses(graduacao: string): string {
  const color = getGraduationColor(graduacao)
  return `${color.bg} ${color.text}`
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
 * Get oval badge HTML with graduation color and optional dan number
 * Returns an object with oval styling
 */
export function getOvalBadgeStyle(
  graduacao: string,
  danNivel?: string | null
): { bgColor: string; textColor: string; content: string } {
  const color = getGraduationColor(graduacao)
  const danNumber = danNivel ? DAN_MAPPING[danNivel.toUpperCase()] : null
  
  return {
    bgColor: color.rgb,
    textColor: danNumber ? 'white' : color.text === 'text-white' ? 'white' : 'black',
    content: danNumber ? String(danNumber) : '●',
  }
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
