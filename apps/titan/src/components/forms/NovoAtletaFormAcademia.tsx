import NovoAtletaFormSimple from './NovoAtletaFormSimple'
import { NovoAtletaFormSimpleProps } from './NovoAtletaFormSimple'

export default function NovoAtletaFormAcademia(props: NovoAtletaFormSimpleProps) {
  // Render academy-specific registration form
  return <NovoAtletaFormSimple {...props} role="academia_admin" />
}
