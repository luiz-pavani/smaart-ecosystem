'use client'

import { useState, useRef } from 'react'
import { Upload, X, AlertCircle, CheckCircle2, Loader2, FileText } from 'lucide-react'

interface PreviewRow {
  nome_completo: string
  email: string | null
  academia: string | null
  academia_id: string | null
  kyu_dan_id: number | null
  status_membro: string | null
  status_plano: string | null
  lote_id: string | null
  warnings: string[]
}

interface DryRunResult {
  dry_run: true
  total: number
  skipped: number
  total_warnings: number
  academias_nao_encontradas: string[]
  preview: PreviewRow[]
}

interface ImportResult {
  dry_run: false
  total: number
  inserted: number
  skipped: number
  errors: string[]
}

interface Props {
  slug: string
  onClose: () => void
  onSuccess?: (inserted: number) => void
}

type Step = 'upload' | 'preview' | 'done'

export default function ImportLrsjModal({ slug, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dryResult, setDryResult] = useState<DryRunResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      setError('Apenas arquivos .csv são aceitos.')
      return
    }
    setFile(f)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleAnalyse = async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('csv_file', file)
      form.append('dry_run', 'true')

      const res = await fetch('/api/federacao/import-lrsj', {
        method: 'POST',
        body: form,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao analisar CSV.')
        return
      }

      setDryResult(data as DryRunResult)
      setStep('preview')
    } catch (e) {
      setError('Erro de rede ao enviar arquivo.')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('csv_file', file)
      form.append('dry_run', 'false')

      const res = await fetch('/api/federacao/import-lrsj', {
        method: 'POST',
        body: form,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao importar.')
        return
      }

      setImportResult(data as ImportResult)
      setStep('done')
      onSuccess?.(data.inserted ?? 0)
    } catch (e) {
      setError('Erro de rede ao importar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold">Importar Smoothcomp</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              IMPORT LRSJ
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* STEP: upload */}
          {step === 'upload' && (
            <>
              <p className="text-sm text-gray-600">
                Faça o upload do CSV exportado do Smoothcomp. O sistema irá analisar e exibir
                um preview antes de qualquer alteração no banco.
              </p>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
              >
                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                {file ? (
                  <>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB — clique para trocar
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-700">
                      Arraste o CSV aqui ou clique para selecionar
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Somente arquivos .csv</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}

          {/* STEP: preview */}
          {step === 'preview' && dryResult && (
            <>
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{dryResult.total}</p>
                  <p className="text-xs text-gray-600">Atletas encontrados</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${dryResult.total_warnings > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                  <p className={`text-2xl font-bold ${dryResult.total_warnings > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {dryResult.total_warnings}
                  </p>
                  <p className="text-xs text-gray-600">Avisos</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-600">{dryResult.skipped}</p>
                  <p className="text-xs text-gray-600">Linhas ignoradas</p>
                </div>
              </div>

              {/* Academias não encontradas */}
              {dryResult.academias_nao_encontradas.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    Academias não encontradas ({dryResult.academias_nao_encontradas.length}) — esses atletas ficarão sem academia_id:
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-0.5">
                    {dryResult.academias_nao_encontradas.map((a) => (
                      <li key={a}>· {a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  Pré-visualização (primeiros {dryResult.preview.length} registros):
                </p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-600 uppercase">
                      <tr>
                        <th className="text-left p-2 font-medium">Nome</th>
                        <th className="text-left p-2 font-medium">Email</th>
                        <th className="text-left p-2 font-medium">Academia</th>
                        <th className="text-left p-2 font-medium">Dan ID</th>
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-left p-2 font-medium">Lote</th>
                        <th className="text-left p-2 font-medium">Avisos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dryResult.preview.map((row, i) => (
                        <tr key={i} className={row.warnings.length > 0 ? 'bg-yellow-50' : ''}>
                          <td className="p-2 font-medium">{row.nome_completo}</td>
                          <td className="p-2 text-gray-500">{row.email ?? '—'}</td>
                          <td className="p-2">
                            {row.academia_id ? (
                              <span className="text-green-700">{row.academia}</span>
                            ) : (
                              <span className="text-orange-500">{row.academia ?? '—'}</span>
                            )}
                          </td>
                          <td className="p-2">{row.kyu_dan_id ?? '—'}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              row.status_plano === 'Válido'
                                ? 'bg-green-100 text-green-700'
                                : row.status_plano === 'Vencido'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {row.status_plano ?? '—'}
                            </span>
                          </td>
                          <td className="p-2 text-gray-500">{row.lote_id ?? '—'}</td>
                          <td className="p-2">
                            {row.warnings.length > 0 ? (
                              <span className="text-yellow-600" title={row.warnings.join('\n')}>
                                ⚠ {row.warnings.length}
                              </span>
                            ) : (
                              <span className="text-green-500">✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}

          {/* STEP: done */}
          {step === 'done' && importResult && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-bold text-gray-800">Importação concluída!</h3>
              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-600">{importResult.inserted}</p>
                  <p className="text-xs text-gray-600">Inseridos/atualizados</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-gray-600">{importResult.skipped}</p>
                  <p className="text-xs text-gray-600">Ignorados</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium text-red-700 mb-1">Erros:</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          {step === 'upload' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnalyse}
                disabled={!file || loading}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Analisar CSV
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setDryResult(null); setError(null) }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar importação ({dryResult?.total ?? 0} atletas)
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
