import NovoAtletaFormSimple from './NovoAtletaFormSimple'
import { NovoAtletaFormSimpleProps } from './NovoAtletaFormSimple'

export default function NovoAtletaFormFederacao(props: NovoAtletaFormSimpleProps) {
  // Render federation-specific registration form
  return <NovoAtletaFormSimple {...props} role="federacao_admin" />
}
