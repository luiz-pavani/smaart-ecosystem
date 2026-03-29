'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, Upload, FileText, CheckCircle2, Clock, XCircle, Eye, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CandidatoDoc {
  id: string
  category: string
  file_url: string
  file_name: string
  status: 'Pendente' | 'Aprovado' | 'Rejeitado'
  feedback?: string
  created_at: string
}

const DOCUMENT_CATEGORIES = [
  {
    key: 'identidade',
    label: 'Documento de Identidade',
    description: 'RG, CNH ou passaporte (frente e verso). PDF ou imagem.',
    accept: 'image/*,.pdf',
    required: true,
  },
  {
    key: 'diploma_anterior',
    label: 'Diploma / Certificado de Graduação Anterior',
    description: 'Certificado da última faixa concedida, assinado pelo sensei responsável.',
    accept: 'image/*,.pdf',
    required: true,
  },
  {
    key: 'historico_competitivo',
    label: 'Histórico Competitivo',
    description: 'Súmulas, certificados de participação ou resultado em competições.',
    accept: 'image/*,.pdf',
    required: false,
  },
  {
    key: 'curso_primeiros_socorros',
    label: 'Curso de Primeiros Socorros',
    description: 'Certificado de conclusão de curso de primeiros socorros (mínimo 8h).',
    accept: 'image/*,.pdf',
    required: true,
  },
  {
    key: 'certificados_cob',
    label: 'Certificados COB / Profep MAX',
    description: 'Certificados dos cursos obrigatórios da plataforma IOB e Profep MAX.',
    accept: 'image/*,.pdf',
    required: true,
  },
]

const STATUS_CONFIG = {
  Pendente: { label: 'Em análise', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', icon: Clock },
  Aprovado: { label: 'Aprovado', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', icon: CheckCircle2 },
  Rejeitado: { label: 'Rejeitado', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: XCircle },
}

export default function DocumentosPage() {
  const supabase = createClient()
  const [docs, setDocs] = useState<CandidatoDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    loadDocs()
  }, [])

  const loadDocs = async () => {
    try {
      const res = await fetch('/api/candidato/documentos')
      const data = await res.json()
      setDocs(data.documentos || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const handleUpload = async (category: string, file: File) => {
    setUploading(category)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = file.name.split('.').pop()
      const path = `${user.id}/${category}/${Date.now()}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('candidato-docs')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Erro ao fazer upload: ' + uploadError.message)
        return
      }

      const { data: urlData } = supabase.storage
        .from('candidato-docs')
        .getPublicUrl(uploadData.path)

      // Save record
      const res = await fetch('/api/candidato/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: urlData.publicUrl,
          file_name: file.name,
          category,
        }),
      })
      const result = await res.json()
      if (result.documento) {
        setDocs(prev => [result.documento, ...prev.filter(d => d.category !== category || d.status !== 'Pendente')])
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Erro ao fazer upload. Tente novamente.')
    } finally {
      setUploading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Documentos</h1>
        <p className="text-slate-400 mt-1">Envie os documentos exigidos pelo Programa de Faixas Pretas</p>
      </div>

      <div className="space-y-4">
        {DOCUMENT_CATEGORIES.map(cat => {
          const catDocs = docs.filter(d => d.category === cat.key)
          const latestDoc = catDocs[0] || null
          const isUploading = uploading === cat.key
          const statusCfg = latestDoc ? STATUS_CONFIG[latestDoc.status] : null

          return (
            <div key={cat.key} className="bg-[#111827] border border-slate-800 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-sm">{cat.label}</h3>
                    {cat.required && (
                      <span className="text-xs text-red-500 font-black uppercase">Obrigatório</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs">{cat.description}</p>
                </div>

                {/* Upload button */}
                <div className="flex-shrink-0">
                  <input
                    ref={el => { fileInputRefs.current[cat.key] = el }}
                    type="file"
                    accept={cat.accept}
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(cat.key, file)
                      e.target.value = ''
                    }}
                  />
                  <button
                    onClick={() => fileInputRefs.current[cat.key]?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 border border-white/10 rounded-lg text-white text-sm transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {isUploading ? 'Enviando...' : latestDoc ? 'Reenviar' : 'Enviar'}
                  </button>
                </div>
              </div>

              {/* Latest doc */}
              {latestDoc && statusCfg && (
                <div className={`mt-4 flex items-center gap-3 p-3 rounded-lg border ${statusCfg.bg}`}>
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{latestDoc.file_name}</p>
                    {latestDoc.feedback && (
                      <p className="text-slate-400 text-xs mt-0.5">{latestDoc.feedback}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <statusCfg.icon className={`w-4 h-4 ${statusCfg.color}`} />
                    <span className={`text-xs font-black uppercase ${statusCfg.color}`}>{statusCfg.label}</span>
                  </div>
                  <a
                    href={latestDoc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* No doc placeholder */}
              {!latestDoc && !isUploading && (
                <div className="mt-4 flex items-center gap-2 p-3 rounded-lg border border-dashed border-slate-700">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-600 text-xs">Nenhum arquivo enviado</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
        <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-2">Formatos aceitos</p>
        <p className="text-slate-400 text-sm">
          PDF, JPG, PNG, HEIC. Tamanho máximo: 10 MB por arquivo. Certifique-se de que os documentos estejam legíveis e sem recortes.
        </p>
      </div>
    </div>
  )
}
