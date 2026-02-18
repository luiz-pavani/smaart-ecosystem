import { QRGenerator } from '../../../../components/acesso/QRGenerator'

export const metadata = {
  title: 'Gerar QR de Acesso | SMAART',
  description: 'Gere seu QR de acesso ao treino',
}

export default function GerarQRPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">QR de Acesso</h1>
        <p className="text-gray-600 mt-1">Gere seu código de acesso ao treino</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QRGenerator />

        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Como funciona?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>1️⃣ Gere seu QR clicando no botão</li>
            <li>2️⃣ O QR é válido por 24 horas</li>
            <li>3️⃣ Na entrada, aponte para a câmera</li>
            <li>4️⃣ Seu acesso é registrado automaticamente</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
