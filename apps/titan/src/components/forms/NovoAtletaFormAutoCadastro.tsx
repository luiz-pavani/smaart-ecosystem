import NovoAtletaFormSimple from './NovoAtletaFormSimple'
import { NovoAtletaFormSimpleProps } from './NovoAtletaFormSimple'

export default function NovoAtletaFormAutoCadastro(props: NovoAtletaFormSimpleProps) {
  // Render self-registration form
  return <NovoAtletaFormSimple {...props} role="auto_cadastro" />
}
