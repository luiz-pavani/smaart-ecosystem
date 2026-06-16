import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'

interface ResultRow {
  categoria: string
  colocacao: number
  medal: string | null
  atleta_nome: string
  academia_nome: string | null
}

interface MedalRow {
  academia_nome: string
  gold: number
  silver: number
  bronze: number
  total: number
}

interface EventoMeta {
  nome: string
  data_evento: string | null
  local: string | null
}

interface Props {
  evento: EventoMeta
  results: ResultRow[]
  medalBoard: MedalRow[]
  categoryFilter?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  // Header
  header: {
    borderBottom: '2pt solid #0891b2',
    paddingBottom: 8,
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  // Section headings
  h2: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 8,
    color: '#0891b2',
    borderBottom: '1pt solid #e2e8f0',
    paddingBottom: 4,
  },
  h3: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    color: '#334155',
  },
  // Tables
  table: {
    width: '100%',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottom: '1pt solid #cbd5e1',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottom: '0.5pt solid #e2e8f0',
  },
  cellPos: { width: 30 },
  cellMedal: { width: 24, textAlign: 'center' as const },
  cellName: { flex: 2, paddingRight: 8 },
  cellAcademia: { flex: 2 },
  cellNum: { width: 36, textAlign: 'center' as const },
  bold: { fontWeight: 'bold' },
  gold: { color: '#ca8a04', fontWeight: 'bold' },
  silver: { color: '#64748b', fontWeight: 'bold' },
  bronze: { color: '#92400e', fontWeight: 'bold' },
  footer: {
    position: 'absolute' as const,
    bottom: 18,
    left: 36,
    right: 36,
    textAlign: 'center' as const,
    fontSize: 8,
    color: '#94a3b8',
    borderTop: '0.5pt solid #e2e8f0',
    paddingTop: 6,
  },
  pageNumber: {
    position: 'absolute' as const,
    bottom: 18,
    right: 36,
    fontSize: 8,
    color: '#94a3b8',
  },
})

function medalSymbol(medal: string | null, colocacao: number): string {
  if (medal === 'gold' || colocacao === 1) return '1º'
  if (medal === 'silver' || colocacao === 2) return '2º'
  if (medal === 'bronze' || colocacao === 3) return '3º'
  return `${colocacao}º`
}

export function ResultadosDocument({ evento, results, medalBoard, categoryFilter }: Props) {
  // Group results por categoria
  const grouped: Record<string, ResultRow[]> = {}
  for (const r of results) {
    if (!grouped[r.categoria]) grouped[r.categoria] = []
    grouped[r.categoria].push(r)
  }
  const sortedCats = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const dateStr = evento.data_evento
    ? new Date(evento.data_evento + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : ''

  return (
    <Document title={`Resultados — ${evento.nome}`} author="Titan" creator="Titan / SMAART PRO">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Resultados Oficiais</Text>
          <Text style={styles.subtitle}>
            {evento.nome}{dateStr ? ` — ${dateStr}` : ''}{evento.local ? ` — ${evento.local}` : ''}
          </Text>
        </View>

        {!categoryFilter && medalBoard.length > 0 && (
          <>
            <Text style={styles.h2}>Quadro de Medalhas por Academia</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader} fixed>
                <Text style={styles.cellPos}>#</Text>
                <Text style={styles.cellName}>Academia</Text>
                <Text style={styles.cellNum}>Ouro</Text>
                <Text style={styles.cellNum}>Prata</Text>
                <Text style={styles.cellNum}>Bronze</Text>
                <Text style={styles.cellNum}>Total</Text>
              </View>
              {medalBoard.map((row, i) => (
                <View key={`${row.academia_nome}-${i}`} style={styles.tableRow} wrap={false}>
                  <Text style={styles.cellPos}>{i + 1}</Text>
                  <Text style={[styles.cellName, styles.bold]}>{row.academia_nome}</Text>
                  <Text style={[styles.cellNum, styles.gold]}>{row.gold || '—'}</Text>
                  <Text style={[styles.cellNum, styles.silver]}>{row.silver || '—'}</Text>
                  <Text style={[styles.cellNum, styles.bronze]}>{row.bronze || '—'}</Text>
                  <Text style={[styles.cellNum, styles.bold]}>{row.total}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.h2}>Resultados por Categoria</Text>
        {sortedCats.map((cat) => {
          const rs = grouped[cat].sort((a, b) => a.colocacao - b.colocacao)
          return (
            <View key={cat} wrap={false}>
              <Text style={styles.h3}>{cat}</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.cellMedal}> </Text>
                  <Text style={styles.cellName}>Atleta</Text>
                  <Text style={styles.cellAcademia}>Academia</Text>
                  <Text style={styles.cellNum}>Pos.</Text>
                </View>
                {rs.map((r, i) => (
                  <View key={`${cat}-${i}`} style={styles.tableRow} wrap={false}>
                    <Text style={[
                      styles.cellMedal,
                      r.medal === 'gold' || r.colocacao === 1 ? styles.gold :
                      r.medal === 'silver' || r.colocacao === 2 ? styles.silver :
                      r.medal === 'bronze' || r.colocacao === 3 ? styles.bronze : {},
                    ]}>
                      {medalSymbol(r.medal, r.colocacao)}
                    </Text>
                    <Text style={[styles.cellName, styles.bold]}>{r.atleta_nome || 'Atleta'}</Text>
                    <Text style={styles.cellAcademia}>{r.academia_nome || '—'}</Text>
                    <Text style={styles.cellNum}>{r.colocacao}º</Text>
                  </View>
                ))}
              </View>
            </View>
          )
        })}

        <Text style={styles.footer} fixed>
          Documento oficial gerado por Titan / SMAART PRO em {new Date().toLocaleDateString('pt-BR')}
        </Text>
        <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
      </Page>
    </Document>
  )
}
