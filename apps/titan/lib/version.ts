/**
 * Application Version Information
 * Auto-updated with each release
 */

export const APP_VERSION = '104.0.0'
export const APP_VERSION_NAME = 'Beta 104'
export const APP_RELEASE_DATE = '2026-03-31'
export const APP_BUILD = 'Aprovação de pedidos de filiação com upsert em user_fed_lrsj + modal completo + data de validade editável'

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
