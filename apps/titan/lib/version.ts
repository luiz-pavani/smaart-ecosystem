/**
 * Application Version Information
 * Auto-updated with each release
 */

export const APP_VERSION = '16.0.0'
export const APP_VERSION_NAME = 'Beta 16'
export const APP_RELEASE_DATE = '2026-02-17'
export const APP_BUILD = 'Subscription status and academy UI with anuidade 2026'

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
