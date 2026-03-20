'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Download, Loader2, BarChart2, Users, Building2, AlertTriangle } from 'lucide-react'

type ReportType = 'mensal' | 'academias' | 'atletas'

interface ReportOption {
  id: ReportType
  title: string
  description: string
  icon: React.ElementType
  color: string
}

const REPORTS: ReportOption[] = [
  {
    id: 'mensal',
    title: 'Relatório Mensal Geral',
    description: 'Visão geral: academias, atletas, crescimento, anuidades e saúde das filiadas.',
    icon: BarChart2,
    color: 'blue',
  },
  {
    id: 'academias',
    title: 'Relatório de Academias',
    description: 'Lista de todas as academias com status de anuidade, atletas ativos e health score.',
    icon: Building2,
    color: 'green',
  },
  {
    id: 'atletas',
    title: 'Relatório de Atletas',
    description: 'Filiados ativos e vencidos, distribuição por academia e situação de plano.',
    icon: Users,
    color: 'purple',
  },
]

export default function RelatoriosPage() {
  const router = useRouter()
  const [generating, setGenerating] = useState<ReportType | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate(type: ReportType) {
    setGenerating(type)
    setError(null)
    try {
      const [dashRes, healthRes] = await Promise.all([
        fetch('/api/federacao/dashboard'),
        fetch('/api/federacao/academias-health'),
      ])
      if (!dashRes.ok) throw new Error('Erro ao carregar dados do dashboard')

      const dash = await dashRes.json()
      const healthJson = healthRes.ok ? await healthRes.json() : { academias: [] }
      const academias: any[] = healthJson.academias || []

      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const now = new Date()
      const dataLabel = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 15

      // ── Header ──────────────────────────────────────────────────────────────
      doc.setFillColor(30, 27, 75)
      doc.rect(0, 0, pageW, 30, 'F')
      doc.setFontSize(16)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('LIGA RIOGRANDENSE DE JIU-JITSU', margin, 13)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Gerado em ${dataLabel} via SMAART PRO`, margin, 22)

      const reportTitles: Record<ReportType, string> = {
        mensal: 'Relatório Mensal Geral',
        academias: 'Relatório de Academias',
        atletas: 'Relatório de Atletas',
      }
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(reportTitles[type], pageW - margin, 13, { align: 'right' })

      let y = 42

      // ── Métricas gerais (todos os tipos) ────────────────────────────────────
      const metrics = [
        { label: 'Total de Academias', value: String(dash.totalAcademias) },
        { label: 'Academias Ativas', value: String(dash.academiasAtivas) },
        { label: 'Filiados Ativos', value: dash.filiadosAtivos?.toLocaleString('pt-BR') },
        { label: 'Crescimento Anual', value: `${dash.deltaFiliados >= 0 ? '+' : ''}${dash.deltaFiliados?.toLocaleString('pt-BR')}` },
      ]

      const colW = (pageW - margin * 2) / 4
      metrics.forEach((m, i) => {
        const x = margin + i * colW
        doc.setFillColor(245, 245, 250)
        doc.roundedRect(x + 1, y, colW - 2, 22, 3, 3, 'F')
        doc.setFontSize(15)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 27, 75)
        doc.text(m.value ?? '—', x + colW / 2, y + 11, { align: 'center' })
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 120)
        doc.text(m.label, x + colW / 2, y + 18, { align: 'center' })
      })
      y += 30

      // ── Conteúdo por tipo ────────────────────────────────────────────────────
      if (type === 'mensal' || type === 'academias') {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 27, 75)
        doc.text('Saúde das Academias', margin, y)
        y += 5

        const nivelLabel: Record<string, string> = { bom: 'Bom', atencao: 'Atenção', critico: 'Crítico' }
        const anuidadeLabel: Record<string, string> = { ok: 'OK', vencendo: 'Vencendo', vencida: 'Vencida', indefinida: '—' }

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [['Academia', 'Atletas Ativos', '% Ativos', 'Anuidade', 'Score', 'Status']],
          body: academias.map((a: any) => [
            a.nome + (a.sigla ? ` (${a.sigla})` : ''),
            `${a.atletas_ativos}/${a.total_atletas}`,
            `${a.pct_ativos}%`,
            anuidadeLabel[a.anuidade_status] ?? '—',
            a.health_score,
            nivelLabel[a.nivel] ?? a.nivel,
          ]),
          headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8.5, textColor: [40, 40, 60] },
          alternateRowStyles: { fillColor: [248, 248, 252] },
          columnStyles: {
            0: { cellWidth: 65 },
            1: { halign: 'center', cellWidth: 28 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 25 },
            4: { halign: 'center', cellWidth: 18 },
            5: { halign: 'center', cellWidth: 22 },
          },
          didParseCell(data) {
            if (data.section === 'body' && data.column.index === 5) {
              const val = data.cell.raw as string
              if (val === 'Crítico') data.cell.styles.textColor = [220, 40, 40]
              else if (val === 'Atenção') data.cell.styles.textColor = [180, 100, 0]
              else if (val === 'Bom') data.cell.styles.textColor = [30, 140, 60]
            }
            if (data.section === 'body' && data.column.index === 3) {
              const val = data.cell.raw as string
              if (val === 'Vencida') data.cell.styles.textColor = [220, 40, 40]
              else if (val === 'Vencendo') data.cell.styles.textColor = [180, 100, 0]
            }
          },
        })
        y = (doc as any).lastAutoTable.finalY + 10
      }

      if (type === 'mensal' || type === 'atletas') {
        // Top academias por atletas ativos
        const topData: { name: string; value: number; subtitle: string }[] = dash.ativosPorFiliada || []
        if (topData.length > 0) {
          if (y > 220) { doc.addPage(); y = 20 }
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 27, 75)
          doc.text('Top Academias — Atletas Ativos', margin, y)
          y += 5

          autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Academia', 'Atletas Ativos', 'Nota']],
            body: topData.slice(0, 10).map((a: any) => [a.name, a.value, a.subtitle || '']),
            headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 8.5, textColor: [40, 40, 60] },
            alternateRowStyles: { fillColor: [248, 248, 252] },
            columnStyles: {
              0: { cellWidth: 100 },
              1: { halign: 'center', cellWidth: 35 },
              2: { cellWidth: 50 },
            },
          })
          y = (doc as any).lastAutoTable.finalY + 10
        }
      }

      if (type === 'mensal') {
        // Resumo de alertas
        const criticas = academias.filter((a: any) => a.nivel === 'critico')
        const vencidas = academias.filter((a: any) => a.anuidade_status === 'vencida')
        if (criticas.length > 0 || vencidas.length > 0) {
          if (y > 230) { doc.addPage(); y = 20 }
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 27, 75)
          doc.text('Alertas — Academias que precisam de atenção', margin, y)
          y += 6

          if (vencidas.length > 0) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(200, 40, 40)
            doc.text(`Anuidades vencidas (${vencidas.length}):`, margin, y)
            y += 5
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(60, 60, 80)
            vencidas.forEach((a: any) => {
              doc.text(`• ${a.nome}`, margin + 4, y)
              y += 4.5
            })
            y += 3
          }

          if (criticas.length > 0) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(200, 40, 40)
            doc.text(`Score crítico (${criticas.length}):`, margin, y)
            y += 5
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(60, 60, 80)
            criticas.forEach((a: any) => {
              doc.text(`• ${a.nome} — score ${a.health_score}`, margin + 4, y)
              y += 4.5
            })
          }
        }
      }

      // ── Footer em todas as páginas ───────────────────────────────────────────
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        const h = doc.internal.pageSize.getHeight()
        doc.setFontSize(7.5)
        doc.setTextColor(150, 150, 170)
        doc.setFont('helvetica', 'normal')
        doc.text('SMAART PRO — Sistema de Gestão Esportiva', margin, h - 8)
        doc.text(`Página ${i} de ${pageCount}`, pageW - margin, h - 8, { align: 'right' })
        doc.setDrawColor(200, 200, 220)
        doc.line(margin, h - 12, pageW - margin, h - 12)
      }

      const filename = `LRSJ_${reportTitles[type].replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`
      doc.save(filename)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Erro ao gerar relatório')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Relatórios</h1>
          <p className="text-slate-400">Gere relatórios PDF da federação</p>
        </div>
        <button
          onClick={() => router.push('/portal/federacao')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10
                     text-slate-300 hover:text-white transition-all border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORTS.map(r => {
          const Icon = r.icon
          const isGenerating = generating === r.id
          const colorMap: Record<string, string> = {
            blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 hover:from-blue-500/20',
            green: 'from-green-500/10 to-green-600/5 border-green-500/20 hover:border-green-500/40 hover:from-green-500/20',
            purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40 hover:from-purple-500/20',
          }
          const iconColorMap: Record<string, string> = {
            blue: 'bg-blue-500/20 text-blue-400',
            green: 'bg-green-500/20 text-green-400',
            purple: 'bg-purple-500/20 text-purple-400',
          }

          return (
            <div
              key={r.id}
              className={`bg-gradient-to-br border rounded-2xl p-6 transition-all duration-300 ${colorMap[r.color]}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconColorMap[r.color]}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{r.title}</h3>
              <p className="text-slate-400 text-sm mb-5">{r.description}</p>
              <button
                onClick={() => generate(r.id)}
                disabled={!!generating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20
                           text-white text-sm font-semibold transition-all disabled:opacity-50 border border-white/10"
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                  : <><Download className="w-4 h-4" /> Baixar PDF</>
                }
              </button>
            </div>
          )
        })}
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <h3 className="text-blue-300 font-semibold text-sm mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Sobre os relatórios
        </h3>
        <ul className="text-gray-400 text-sm space-y-1">
          <li>• Os dados são gerados em tempo real com base na situação atual da federação</li>
          <li>• O PDF é criado localmente no seu navegador e baixado diretamente</li>
          <li>• Relatório Mensal inclui alertas de academias com anuidade vencida ou score crítico</li>
        </ul>
      </div>
    </div>
  )
}
