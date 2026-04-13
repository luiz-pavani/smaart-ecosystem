/**
 * Application Version Information
 * Auto-updated with each release
 */

export const APP_VERSION = '110.0.0'
export const APP_VERSION_NAME = 'Beta 110'
export const APP_RELEASE_DATE = '2026-04-04'
export const APP_BUILD = 'Página unificada Atletas & Filiações — API filiados com supabaseAdmin, fix upsert federacao_id INTEGER, sincronização manual de pedidos aprovados'

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
