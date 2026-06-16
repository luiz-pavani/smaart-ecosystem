import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica' },
  header: { marginBottom: 12 },
  title: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#666' },
  meta: { fontSize: 8, color: '#999', marginTop: 4 },
  table: { marginTop: 10, borderWidth: 1, borderColor: '#bbb' },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#ddd' },
  rowEven: { backgroundColor: '#f7f7f7' },
  th: { fontWeight: 'bold', backgroundColor: '#222', color: '#fff', padding: 4 },
  td: { padding: 4 },
  cIdx: { width: 24, textAlign: 'center' },
  cNome: { flex: 3 },
  cCat: { flex: 2 },
  cPesoIns: { width: 50, textAlign: 'right' },
  cPesoOf: { width: 50, textAlign: 'right' },
  cDiff: { width: 50, textAlign: 'right' },
  cStatus: { width: 60, textAlign: 'center' },
  cSig: { flex: 1.5, borderBottom: '0.5pt solid #999' },
  badge: { fontSize: 7, padding: 1, borderRadius: 2, textAlign: 'center' },
  ok: { backgroundColor: '#d1fae5', color: '#065f46' },
  rej: { backgroundColor: '#fee2e2', color: '#991b1b' },
  pend: { backgroundColor: '#fef3c7', color: '#92400e' },
  acima: { backgroundColor: '#fed7aa', color: '#9a3412' },
  abaixo: { backgroundColor: '#dbeafe', color: '#1e40af' },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, fontSize: 7, color: '#999', textAlign: 'center', paddingTop: 4, borderTopWidth: 0.5, borderColor: '#ccc' },
  summary: { marginTop: 6, fontSize: 8, color: '#666' },
})

interface Row {
  id: string
  nome: string
  categoria: string
  peso_inscricao: number | null
  peso_oficial: number | null
  status: string
  diff?: number | null
}

interface Props {
  eventoNome: string
  dataEvento: string
  rows: Row[]
  counts: { total: number; aprovado: number; rejeitado: number; pendente: number; acima: number; abaixo: number }
}

function statusBadge(status: string) {
  switch (status) {
    case 'aprovado': return styles.ok
    case 'rejeitado': return styles.rej
    case 'acima': return styles.acima
    case 'abaixo': return styles.abaixo
    default: return styles.pend
  }
}

export default function PesagemDocument({ eventoNome, dataEvento, rows, counts }: Props) {
  const ts = new Date().toLocaleString('pt-BR')
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Lista Oficial de Pesagem</Text>
          <Text style={styles.subtitle}>{eventoNome} · {dataEvento}</Text>
          <Text style={styles.meta}>Gerado em {ts} · Total: {counts.total} · Aprovados: {counts.aprovado} · Reprovados: {counts.rejeitado} · Pendentes: {counts.pendente}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, { borderBottomWidth: 1 }]}>
            <Text style={[styles.th, styles.cIdx]}>#</Text>
            <Text style={[styles.th, styles.cNome]}>Atleta</Text>
            <Text style={[styles.th, styles.cCat]}>Categoria</Text>
            <Text style={[styles.th, styles.cPesoIns]}>Insc. (kg)</Text>
            <Text style={[styles.th, styles.cPesoOf]}>Oficial</Text>
            <Text style={[styles.th, styles.cDiff]}>Δ</Text>
            <Text style={[styles.th, styles.cStatus]}>Status</Text>
            <Text style={[styles.th, styles.cSig]}>Assinatura</Text>
          </View>
          {rows.map((r, i) => {
            const diff = r.peso_oficial !== null && r.peso_inscricao !== null
              ? r.peso_oficial - r.peso_inscricao : null
            return (
              <View key={r.id} style={[styles.row, i % 2 === 0 ? styles.rowEven : {}]} wrap={false}>
                <Text style={[styles.td, styles.cIdx]}>{i + 1}</Text>
                <Text style={[styles.td, styles.cNome]}>{r.nome}</Text>
                <Text style={[styles.td, styles.cCat]}>{r.categoria}</Text>
                <Text style={[styles.td, styles.cPesoIns]}>{r.peso_inscricao !== null ? r.peso_inscricao.toFixed(2) : '—'}</Text>
                <Text style={[styles.td, styles.cPesoOf]}>{r.peso_oficial !== null ? r.peso_oficial.toFixed(2) : '—'}</Text>
                <Text style={[styles.td, styles.cDiff]}>{diff !== null ? (diff >= 0 ? '+' : '') + diff.toFixed(2) : '—'}</Text>
                <View style={[styles.td, styles.cStatus]}>
                  <Text style={[styles.badge, statusBadge(r.status)]}>{r.status.toUpperCase()}</Text>
                </View>
                <Text style={[styles.td, styles.cSig]}> </Text>
              </View>
            )
          })}
        </View>

        <Text style={styles.summary}>
          Resumo: {counts.total} pesagens registradas. Aprovados {counts.aprovado} · Reprovados {counts.rejeitado} · Acima do peso {counts.acima} · Abaixo do peso {counts.abaixo} · Pendentes {counts.pendente}.
        </Text>

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages} · Titan / SMAART PRO`} />
      </Page>
    </Document>
  )
}
