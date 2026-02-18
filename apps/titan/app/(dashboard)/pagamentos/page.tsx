import { PagamentosLista } from '../../../components/pagamentos/PagamentosLista'

export const metadata = {
  title: 'Pagamentos | SMAART',
  description: 'Dashboard de pagamentos',
}

export default function PagamentosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pagamentos</h1>
        <p className="text-gray-600 mt-1">Gerencie pedidos de pagamento</p>
      </div>

      <PagamentosLista />
    </div>
  )
}
