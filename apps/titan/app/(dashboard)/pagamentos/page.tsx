import { PagamentosLista } from '../../../components/pagamentos/PagamentosLista'
import { CriarPedidoForm } from '../../../components/pagamentos/CriarPedidoForm'
import { PagamentosStats } from '../../../components/pagamentos/PagamentosStats'

export const metadata = {
  title: 'Pagamentos | SMAART',
  description: 'Dashboard de pagamentos - Criar e gerenciar pedidos',
}

export default function PagamentosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pagamentos</h1>
        <p className="text-gray-600 mt-1">Crie novos pagamentos e acompanhe o histórico</p>
      </div>

      <PagamentosStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CriarPedidoForm />
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <h3 className="font-bold text-yellow-900 mb-3 text-lg">📋 Como criar um pagamento:</h3>
          <ol className="space-y-2 text-sm text-yellow-800">
            <li><strong>1. Academia:</strong> Selecione a academia responsável</li>
            <li><strong>2. Atleta:</strong> Escolha o atleta que vai pagar</li>
            <li><strong>3. Valor:</strong> Insira o valor do pagamento</li>
            <li><strong>4. Método:</strong> Escolha PIX, Boleto ou Cartão</li>
            <li><strong>5. Enviar:</strong> Clique em "Criar Pagamento"</li>
          </ol>
          <p className="text-xs text-yellow-700 mt-4 italic">
            ℹ️ Diferentes métodos têm diferentes taxas. PIX é sem taxa!
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900">Histórico de Pagamentos</h2>
        </div>
        <PagamentosLista />
      </div>
    </div>
  )
}
