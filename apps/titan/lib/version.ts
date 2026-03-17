/**
 * Application Version Information
 * Auto-updated with each release
 */

export const APP_VERSION = '55.0.0'
export const APP_VERSION_NAME = 'Beta 55'
export const APP_RELEASE_DATE = '2026-03-16'
export const APP_BUILD = 'Detalhe do atleta com presença histórica e offset de pontos - Beta 55'

export const getVersionString = () => {
  return `${APP_VERSION_NAME} (v${APP_VERSION})`
}

export const getVersionInfo = () => {
  return {
    version: APP_VERSION,
    name: APP_VERSION_NAME,
    releaseDate: APP_RELEASE_DATE,
    build: APP_BUILD,
    fullString: getVersionString(),
  }
}
