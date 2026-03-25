/**
 * Application Version Information
 * Auto-updated with each release
 */

export const APP_VERSION = '85.0.0'
export const APP_VERSION_NAME = 'Beta 85'
export const APP_RELEASE_DATE = '2026-03-25'
export const APP_BUILD = 'BN cor ROSA #ca44cb - Beta 85'

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
