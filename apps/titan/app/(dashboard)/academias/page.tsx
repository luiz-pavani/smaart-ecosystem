import { redirect } from 'next/navigation'

/**
 * Versão antiga da listagem de academias. A canônica é
 * /portal/federacao/academias (mais campos, export PDF/Excel, modal de
 * nova academia, contagem de atletas). Mantemos esta rota como redirect
 * para preservar links antigos.
 *
 * Sub-rotas como /academias/[id]/editar e /academias/criar continuam
 * funcionando — só a listagem foi unificada.
 */
export default function AcademiasIndexRedirect() {
  redirect('/portal/federacao/academias')
}
