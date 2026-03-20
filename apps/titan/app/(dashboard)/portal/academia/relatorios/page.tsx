'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'
import { ArrowLeft, FileText, Download, Loader2, Users, BarChart3, Star } from 'lucide-react'

interface ReportData {
  academia: { nome: string; cidade: string | null; estado: string | null }
  atletas: {
    id: string
    nome_completo: string
    graduacao: string
    cor_faixa: string | null
    status_plano: string
    data_expiracao: string | null
    checkins_30d: number
  }[]
  por_turma: { name: string; checkins: number; atletas_unicos: number }[]
  por_dia_semana: { label: string; count: number }[]
  nps: { avg: number | null; total: number }
  total_checkins: number
  gerado_em: string
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + (iso.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')
}

export default function RelatoriosAcademiaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const academiaId = await resolveAcademiaId(supabase)
      const params = academiaId ? `?academia_id=${academiaId}` : ''
      const res = await fetch(`/api/academia/relatorios${params}`)
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setData(json)
    }
    load().finally(() => setLoading(false))
  }, [])

  const gerarRelatorioGeral = async () => {
    if (!data) return
    setGenerating('geral')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const now = new Date(data.gerado_em)
      const mes = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      const W = doc.internal.pageSize.getWidth()

      // Header
      doc.setFillColor(30, 30, 60)
      doc.rect(0, 0, W, 36, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(data.academia.nome, 14, 16)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Relatório Geral — Últimos 30 dias', 14, 24)
      doc.text(`Gerado em ${now.toLocaleDateString('pt-BR')}`, 14, 30)

      // Metrics row
      const totalAtletas = data.atletas.length
      const planoValido = data.atletas.filter(a => a.status_plano === 'Válido').length
      const planoPendente = totalAtletas - planoValido
      const mediaCheckins = totalAtletas > 0
        ? (data.total_checkins / totalAtletas).toFixed(1)
        : '0'

      const metrics = [
        { label: 'Total de Atletas', value: String(totalAtletas) },
        { label: 'Plano Válido', value: String(planoValido) },
        { label: 'Plano Vencido', value: String(planoPendente) },
        { label: 'Check-ins (30d)', value: String(data.total_checkins) },
        { label: 'Média/Atleta (30d)', value: mediaCheckins },
        { label: 'NPS Médio', value: data.nps.avg !== null ? `${data.nps.avg} ★` : '—' },
      ]

      let y = 46
      const boxW = (W - 28 - 10) / 3
      metrics.forEach((m, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        const x = 14 + col * (boxW + 5)
        const yy = y + row * 22
        doc.setFillColor(245, 245, 250)
        doc.setDrawColor(200, 200, 220)
        doc.roundedRect(x, yy, boxW, 18, 2, 2, 'FD')
        doc.setTextColor(100, 100, 130)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(m.label.toUpperCase(), x + 4, yy + 6)
        doc.setTextColor(20, 20, 50)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(m.value, x + 4, yy + 14)
      })

      y += 50

      // Frequência por dia da semana
      doc.setTextColor(20, 20, 50)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Frequência por Dia da Semana (últimos 30 dias)', 14, y)
      y += 6

      const maxCount = Math.max(...data.por_dia_semana.map(d => d.count), 1)
      const barAreaW = W - 28
      const barH = 8
      const barGap = 3

      data.por_dia_semana.forEach((d, i) => {
        const barW = (d.count / maxCount) * (barAreaW - 28)
        const yy = y + i * (barH + barGap)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 100)
        doc.text(d.label, 14, yy + barH - 2)
        doc.setFillColor(200, 200, 240)
        doc.roundedRect(28, yy, barAreaW - 28, barH, 1, 1, 'F')
        if (d.count > 0) {
          doc.setFillColor(100, 80, 200)
          doc.roundedRect(28, yy, barW, barH, 1, 1, 'F')
        }
        doc.setTextColor(60, 60, 80)
        doc.setFontSize(7)
        doc.text(String(d.count), 28 + barW + 2, yy + barH - 2)
      })

      y += data.por_dia_semana.length * (barH + barGap) + 10

      // Top turmas
      if (data.por_turma.length > 0) {
        doc.setTextColor(20, 20, 50)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Frequência por Turma (últimos 30 dias)', 14, y)
        y += 4
        autoTable(doc, {
          startY: y,
          head: [['Turma', 'Check-ins', 'Atletas únicos']],
          body: data.por_turma.map(t => [t.name, t.checkins, t.atletas_unicos]),
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [30, 30, 60], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 248, 255] },
          margin: { left: 14, right: 14 },
        })
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 160)
        doc.text(
          `${data.academia.nome} · Página ${i} de ${pageCount}`,
          W / 2, doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        )
      }

      doc.save(`relatorio-geral-${now.toISOString().split('T')[0]}.pdf`)
    } finally {
      setGenerating(null)
    }
  }

  const gerarRelatorioAtletas = async () => {
    if (!data) return
    setGenerating('atletas')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const now = new Date(data.gerado_em)
      const W = doc.internal.pageSize.getWidth()

      doc.setFillColor(30, 30, 60)
      doc.rect(0, 0, W, 30, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(data.academia.nome, 14, 13)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Lista de Atletas · Gerado em ${now.toLocaleDateString('pt-BR')}`, 14, 22)

      const ativos = data.atletas.filter(a => a.status_plano === 'Válido').length
      const inativos = data.atletas.length - ativos
      doc.setTextColor(200, 220, 255)
      doc.setFontSize(8)
      doc.text(
        `Total: ${data.atletas.length}  ·  Plano Válido: ${ativos}  ·  Plano Vencido/Sem Plano: ${inativos}`,
        W - 14, 22, { align: 'right' }
      )

      autoTable(doc, {
        startY: 36,
        head: [['Nome', 'Graduação', 'Status Plano', 'Vencimento', 'Check-ins (30d)']],
        body: data.atletas.map(a => [
          a.nome_completo,
          a.graduacao,
          a.status_plano,
          fmtDate(a.data_expiracao),
          a.checkins_30d,
        ]),
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 30, 60], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 255] },
        columnStyles: {
          0: { cellWidth: 75 },
          1: { cellWidth: 45 },
          2: { cellWidth: 30 },
          3: { cellWidth: 28 },
          4: { cellWidth: 25, halign: 'center' },
        },
        didParseCell: (hookData: any) => {
          if (hookData.column.index === 2 && hookData.section === 'body') {
            const val = String(hookData.cell.raw)
            if (val === 'Válido') hookData.cell.styles.textColor = [22, 163, 74]
            else if (val !== '—') hookData.cell.styles.textColor = [220, 38, 38]
          }
          if (hookData.column.index === 4 && hookData.section === 'body') {
            const val = Number(hookData.cell.raw)
            if (val === 0) hookData.cell.styles.textColor = [180, 100, 100]
            else if (val >= 8) hookData.cell.styles.textColor = [22, 163, 74]
          }
        },
        margin: { left: 14, right: 14 },
      })

      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150, 150, 160)
        doc.text(
          `${data.academia.nome} · Página ${i} de ${pageCount}`,
          W / 2, doc.internal.pageSize.getHeight() - 6,
          { align: 'center' }
        )
      }

      doc.save(`atletas-${now.toISOString().split('T')[0]}.pdf`)
    } finally {
      setGenerating(null)
    }
  }

  const gerarRelatorioFrequencia = async () => {
    if (!data) return
    setGenerating('frequencia')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const now = new Date(data.gerado_em)
      const W = doc.internal.pageSize.getWidth()

      doc.setFillColor(30, 30, 60)
      doc.rect(0, 0, W, 30, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(data.academia.nome, 14, 13)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Frequência por Turma — Últimos 30 dias · Gerado em ${now.toLocaleDateString('pt-BR')}`, 14, 22)

      // Summary
      doc.setFillColor(245, 245, 250)
      doc.roundedRect(14, 34, W - 28, 18, 2, 2, 'F')
      doc.setTextColor(80, 80, 100)
      doc.setFontSize(8)
      doc.text('TOTAL DE CHECK-INS', 20, 41)
      doc.text('TURMAS COM PRESENÇA', W / 2, 41)
      doc.text('MÉDIA POR TURMA', W - 20, 41, { align: 'right' })
      doc.setTextColor(20, 20, 50)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(String(data.total_checkins), 20, 49)
      doc.text(String(data.por_turma.length), W / 2, 49)
      const mediaStr = data.por_turma.length > 0
        ? (data.total_checkins / data.por_turma.length).toFixed(1)
        : '0'
      doc.text(mediaStr, W - 20, 49, { align: 'right' })

      // Frequency table
      autoTable(doc, {
        startY: 58,
        head: [['#', 'Turma', 'Check-ins', 'Atletas únicos', '% do total']],
        body: data.por_turma.map((t, i) => [
          i + 1,
          t.name,
          t.checkins,
          t.atletas_unicos,
          data.total_checkins > 0
            ? `${((t.checkins / data.total_checkins) * 100).toFixed(1)}%`
            : '0%',
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 30, 60], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 255] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 90 },
          2: { cellWidth: 28, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
      })

      // Day of week chart below the table
      const finalY = (doc as any).lastAutoTable.finalY + 10
      if (finalY < doc.internal.pageSize.getHeight() - 40) {
        doc.setTextColor(20, 20, 50)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Check-ins por Dia da Semana', 14, finalY)

        const maxCount = Math.max(...data.por_dia_semana.map(d => d.count), 1)
        const barAreaW = W - 28 - 30
        const barH = 8
        const barGap = 3
        data.por_dia_semana.forEach((d, i) => {
          const barW = (d.count / maxCount) * barAreaW
          const yy = finalY + 6 + i * (barH + barGap)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 100)
          doc.text(d.label, 14, yy + barH - 2)
          doc.setFillColor(200, 200, 240)
          doc.roundedRect(28, yy, barAreaW, barH, 1, 1, 'F')
          if (d.count > 0) {
            doc.setFillColor(100, 80, 200)
            doc.roundedRect(28, yy, barW, barH, 1, 1, 'F')
          }
          doc.setTextColor(60, 60, 80)
          doc.setFontSize(7)
          doc.text(String(d.count), 28 + barW + 2, yy + barH - 2)
        })
      }

      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150, 150, 160)
        doc.text(
          `${data.academia.nome} · Página ${i} de ${pageCount}`,
          W / 2, doc.internal.pageSize.getHeight() - 6,
          { align: 'center' }
        )
      }

      doc.save(`frequencia-turmas-${now.toISOString().split('T')[0]}.pdf`)
    } finally {
      setGenerating(null)
    }
  }

  const REPORTS = [
    {
      id: 'geral',
      title: 'Relatório Geral',
      description: 'Métricas do mês, frequência por dia da semana, NPS e ranking de turmas.',
      icon: <BarChart3 className="w-7 h-7 text-purple-400" />,
      color: 'from-purple-500/10 to-blue-500/5 border-purple-500/20',
      action: gerarRelatorioGeral,
    },
    {
      id: 'atletas',
      title: 'Lista de Atletas',
      description: 'Todos os atletas com graduação, status do plano, vencimento e check-ins dos últimos 30 dias.',
      icon: <Users className="w-7 h-7 text-blue-400" />,
      color: 'from-blue-500/10 to-cyan-500/5 border-blue-500/20',
      action: gerarRelatorioAtletas,
    },
    {
      id: 'frequencia',
      title: 'Frequência por Turma',
      description: 'Ranking de check-ins e atletas únicos por turma nos últimos 30 dias.',
      icon: <Star className="w-7 h-7 text-amber-400" />,
      color: 'from-amber-500/10 to-yellow-500/5 border-amber-500/20',
      action: gerarRelatorioFrequencia,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Relatórios</h1>
          <p className="text-slate-400">Gere PDFs com os dados da sua academia</p>
        </div>
        <button
          onClick={() => router.push('/portal/academia')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10
                     text-slate-300 hover:text-white transition-all border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando dados...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300 text-sm">{error}</div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Atletas', value: data.atletas.length },
              { label: 'Plano válido', value: data.atletas.filter(a => a.status_plano === 'Válido').length },
              { label: 'Check-ins (30d)', value: data.total_checkins },
              { label: 'NPS médio', value: data.nps.avg !== null ? `${data.nps.avg} ★` : '—' },
            ].map((m, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{m.value}</p>
                <p className="text-xs text-gray-400 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Report cards */}
          <div className="grid grid-cols-1 gap-4">
            {REPORTS.map(r => (
              <div
                key={r.id}
                className={`bg-gradient-to-br ${r.color} border rounded-xl p-6 flex items-center justify-between gap-6`}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">{r.icon}</div>
                  <div>
                    <h2 className="text-white font-semibold text-lg">{r.title}</h2>
                    <p className="text-gray-400 text-sm mt-1">{r.description}</p>
                  </div>
                </div>
                <button
                  onClick={r.action}
                  disabled={generating !== null}
                  className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20
                             text-white font-medium transition-all border border-white/10 disabled:opacity-50"
                >
                  {generating === r.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                  ) : (
                    <><Download className="w-4 h-4" /> Baixar PDF</>
                  )}
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-600">
            Dados referentes aos últimos 30 dias · {new Date(data.gerado_em).toLocaleString('pt-BR')}
          </p>
        </>
      ) : null}
    </div>
  )
}
