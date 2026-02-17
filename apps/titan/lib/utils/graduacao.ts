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

// Graduation list in order (display labels)
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

// Graduation list in database format (for forms)
export const GRADUACOES_DB = [
  'BRANCA|MÚKYŪ',
  'BRANCA/CINZA|MÚKYŪ',
  'CINZA|NANA-KYU',
  'CINZA/AZUL|NANA-KYU',
  'AZUL|ROKKYŪ',
  'AZUL/AMARELA|ROKKYŪ',
  'AMARELA|GOKYŪ',
  'AMARELA/LARANJA|GOKYŪ',
  'LARANJA|YONKYŪ',
  'VERDE|SANKYŪ',
  'ROXA|NIKYŪ',
  'MARROM|IKKYŪ',
  'FAIXA PRETA|YUDANSHA',
  'VERMELHA/BRANCA|ROKUDAN',
  'VERMELHA/BRANCA|NANADAN',
  'VERMELHA/BRANCA|HACHIDAN',
  'VERMELHA|KYUDAN',
  'VERMELHA|JUDAN',
]

export const DAN_NIVEIS = [
  'SHODAN',
  'NIDAN',
  'SANDAN',
  'YONDAN',
  'GODAN',
  'ROKUDAN',
  'NANADAN',
  'HACHIDAN',
  'KYUDAN',
  'JUDAN',
]

// 9 níveis de arbitragem (Referee Levels)
export const NIVEIS_ARBITRAGEM = [
  'Estadual C',
  'Estadual B',
  'Estadual A',
  'Nacional C',
  'Nacional B',
  'Nacional A',
  'Internacional C',
  'Internacional B',
  'Internacional A',
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
 * Get dual oval badges with graduation colors
 * Returns two colors representing the belt (front and back sides)
 */
export function getDualOvalBadges(
  graduacao: string,
  danNivel?: string | null
): { left: { rgb: string; text: string }; right: { rgb: string; text: string }; danNumber?: number } {
  const grad = extractGraduationName(graduacao).toUpperCase()
  const danNumber = danNivel ? DAN_MAPPING[danNivel.toUpperCase()] : undefined

  // Map each graduation to its two colors (left and right)
  const dualColorMap: Record<string, [string, string]> = {
    BRANCA: ['BRANCA', 'BRANCA'],
    CINZA: ['CINZA', 'CINZA'],
    AZUL: ['AZUL', 'AZUL'],
    AMARELA: ['AMARELA', 'AMARELA'],
    LARANJA: ['LARANJA', 'LARANJA'],
    VERDE: ['VERDE', 'VERDE'],
    ROXA: ['ROXA', 'ROXA'],
    MARROM: ['MARROM', 'MARROM'],
    PRETA: ['PRETA', 'PRETA'],
    VERMELHA: ['VERMELHA', 'VERMELHA'],
  }

  // Check for dual-color belts (with slash or specific patterns)
  let leftColor = 'BRANCA'
  let rightColor = 'BRANCA'

  if (grad.includes('BRANCA/CINZA')) {
    leftColor = 'BRANCA'
    rightColor = 'CINZA'
  } else if (grad.includes('CINZA/AZUL')) {
    leftColor = 'CINZA'
    rightColor = 'AZUL'
  } else if (grad.includes('AZUL/AMARELA')) {
    leftColor = 'AZUL'
    rightColor = 'AMARELA'
  } else if (grad.includes('AMARELA/LARANJA')) {
    leftColor = 'AMARELA'
    rightColor = 'LARANJA'
  } else if (grad.includes('VERMELHA/BRANCA')) {
    leftColor = 'VERMELHA'
    rightColor = 'BRANCA'
  } else {
    // Single color belts - use the two-color map or default
    for (const [key, [l, r]] of Object.entries(dualColorMap)) {
      if (grad.includes(key)) {
        leftColor = l
        rightColor = r
        break
      }
    }
  }

  const leftColorObj = GRADUATION_COLORS[leftColor] || GRADUATION_COLORS.BRANCA
  const rightColorObj = GRADUATION_COLORS[rightColor] || GRADUATION_COLORS.BRANCA

  return {
    left: { rgb: leftColorObj.rgb, text: leftColorObj.text },
    right: { rgb: rightColorObj.rgb, text: rightColorObj.text },
    danNumber,
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
