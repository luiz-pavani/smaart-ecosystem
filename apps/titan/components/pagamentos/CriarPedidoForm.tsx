'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, X } from 'lucide-react'

interface Academia {
  id: string
  sigla: string
  nome: string
}

interface Atleta {
  id: string
  nome: string
  cpf: string
}

interface FormData {
  academia_id: string
  atleta_id: string
  valor: string
  metodo_pagamento: 'PIX' | 'BOLETO' | 'CREDITCARD'
}

interface FormError {
  field: keyof FormData | 'general'
  message: string
}

export function CriarPedidoForm() {
  const [formData, setFormData] = useState<FormData>({
    academia_id: '',
    atleta_id: '',
    valor: '',
    metodo_pagamento: 'PIX'
  })

  const [academias, setAcademias] = useState<Academia[]>([])
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormError[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingAcademias, setLoadingAcademias] = useState(true)
  const [loadingAtletas, setLoadingAtletas] = useState(false)

  // Carregar academias no mount
  useEffect(() => {
    const fetchAcademias = async () => {
      try {
        const res = await fetch('/api/academias/listar')
        const data = await res.json()
        setAcademias(data.academias || [])
      } catch (error) {
        console.error('Erro ao carregar academias:', error)
        setErrors([{ field: 'general', message: 'Erro ao carregar academias' }])
      } finally {
        setLoadingAcademias(false)
      }
    }
    fetchAcademias()
  }, [])

  // Carregar atletas quando academia muda
  useEffect(() => {
    if (!formData.academia_id) {
      setAtletas([])
      setFormData(prev => ({ ...prev, atleta_id: '' }))
      return
    }

    const fetchAtletas = async () => {
      setLoadingAtletas(true)
      try {
        const res = await fetch(`/api/atletas/por-academia?academia_id=${formData.academia_id}`)
        const data = await res.json()
        setAtletas(data.atletas || [])
      } catch (error) {
        console.error('Erro ao carregar atletas:', error)
        setErrors([{ field: 'general', message: 'Erro ao carregar atletas' }])
      } finally {
        setLoadingAtletas(false)
      }
    }
    fetchAtletas()
  }, [formData.academia_id])

  // Validação do form
  const validateForm = (): boolean => {
    const newErrors: FormError[] = []

    if (!formData.academia_id) {
      newErrors.push({ field: 'academia_id', message: 'Selecione uma academia' })
    }

    if (!formData.atleta_id) {
      newErrors.push({ field: 'atleta_id', message: 'Selecione um atleta' })
    }

    if (!formData.valor) {
      newErrors.push({ field: 'valor', message: 'Digite o valor' })
    } else {
      const valor = parseFloat(formData.valor)
      if (isNaN(valor) || valor <= 0) {
        newErrors.push({ field: 'valor', message: 'Valor deve ser maior que 0' })
      }
      if (valor > 999999) {
        newErrors.push({ field: 'valor', message: 'Valor máximo é R$ 999.999,00' })
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => prev.filter(err => err.field !== name))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setSuccess(null)

    try {
      const res = await fetch('/api/pagamentos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          valor: parseFloat(formData.valor)
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.erro || 'Erro ao criar pagamento')
      }

      setSuccess(`✅ Pagamento criado com sucesso! ID: ${data.pedido_id}`)
      
      setFormData({
        academia_id: '',
        atleta_id: '',
        valor: '',
        metodo_pagamento: 'PIX'
      })

      setTimeout(() => setSuccess(null), 5000)

    } catch (error) {
      setErrors([{ 
        field: 'general', 
        message: error instanceof Error ? error.message : 'Erro ao criar pagamento'
      }])
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = formData.academia_id && formData.atleta_id && formData.valor

  const taxas: Record<string, number> = {
    'PIX': 0,
    'BOLETO': 1.5,
    'CREDITCARD': 3.5
  }

  const valorFinal = formData.valor 
    ? parseFloat(formData.valor) * (1 + taxas[formData.metodo_pagamento] / 100)
    : 0

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Criar Novo Pagamento</h2>

      {errors.some(e => e.field === 'general') && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-red-800 font-semibold">Erro</p>
            <p className="text-red-700 text-sm">
              {errors.find(e => e.field === 'general')?.message}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-green-700 font-semibold">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Academia <span className="text-red-500">*</span>
          </label>
          <select
            name="academia_id"
            value={formData.academia_id}
            onChange={handleChange}
            disabled={loadingAcademias}
            className={`w-full px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.some(e => e.field === 'academia_id') 
                ? 'border-red-500' 
                : 'border-gray-300'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          >
            <option value="">
              {loadingAcademias ? 'Carregando...' : 'Selecione uma academia'}
            </option>
            {academias.map(a => (
              <option key={a.id} value={a.id}>
                {a.sigla} - {a.nome}
              </option>
            ))}
          </select>
          {errors.some(e => e.field === 'academia_id') && (
            <p className="text-red-500 text-sm mt-1">
              {errors.find(e => e.field === 'academia_id')?.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Atleta <span className="text-red-500">*</span>
          </label>
          <select
            name="atleta_id"
            value={formData.atleta_id}
            onChange={handleChange}
            disabled={!formData.academia_id || loadingAtletas}
            className={`w-full px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.some(e => e.field === 'atleta_id')
                ? 'border-red-500'
                : 'border-gray-300'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          >
            <option value="">
              {!formData.academia_id 
                ? 'Selecione uma academia primeiro'
                : loadingAtletas 
                ? 'Carregando atletas...'
                : 'Selecione um atleta'}
            </option>
            {atletas.map(a => (
              <option key={a.id} value={a.id}>
                {a.nome} ({a.cpf})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor (R$) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="valor"
            value={formData.valor}
            onChange={handleChange}
            placeholder="129.90"
            min="0"
            step="0.01"
            max="999999"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.some(e => e.field === 'valor')
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Método de Pagamento
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(taxas) as Array<keyof typeof taxas>).map(metodo => (
              <label key={metodo} className="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                style={{
                  borderColor: formData.metodo_pagamento === metodo ? '#3b82f6' : '#e5e7eb',
                  backgroundColor: formData.metodo_pagamento === metodo ? '#eff6ff' : 'white'
                }}
              >
                <input
                  type="radio"
                  name="metodo_pagamento"
                  value={metodo}
                  checked={formData.metodo_pagamento === metodo}
                  onChange={handleChange}
                  className="cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-800">{metodo}</div>
                  <div className="text-xs text-gray-500">
                    {taxas[metodo] === 0 ? 'Sem taxa' : `Taxa: ${taxas[metodo]}%`}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {formData.valor && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Valor informado</p>
                <p className="text-lg font-semibold text-gray-800">
                  R$ {parseFloat(formData.valor).toFixed(2)}
                </p>
              </div>
              {taxas[formData.metodo_pagamento] > 0 && (
                <>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Taxa ({taxas[formData.metodo_pagamento]}%)</p>
                    <p className="text-lg font-semibold text-gray-800">
                      R$ {(parseFloat(formData.valor) * taxas[formData.metodo_pagamento] / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total a receber</p>
                    <p className="text-lg font-bold text-blue-600">
                      R$ {valorFinal.toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Criando pagamento...' : 'Criar Pagamento'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                academia_id: '',
                atleta_id: '',
                valor: '',
                metodo_pagamento: 'PIX'
              })
              setErrors([])
            }}
            className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Limpar
          </button>
        </div>
      </form>
    </div>
  )
}