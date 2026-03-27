/**
 * Application Version Information
 * Auto-updated with each release
 */

export const APP_VERSION = '95.0.0'
export const APP_VERSION_NAME = 'Beta 95'
export const APP_RELEASE_DATE = '2026-03-27'
export const APP_BUILD = 'WhatsApp OTP auth + templates UTILITY _v2 + fed_novo_cadastro + cron 8h BRT - Beta 95'

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
