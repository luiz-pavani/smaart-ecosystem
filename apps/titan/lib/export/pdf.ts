import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PDFColumn {
  header: string
  dataKey: string
}

export interface PDFExportOptions {
  title: string
  subtitle?: string
  columns: PDFColumn[]
  data: any[]
  filename?: string
}

export function exportToPDF(options: PDFExportOptions) {
  const { title, subtitle, columns, data, filename } = options
  
  // Create new PDF document
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(18)
  doc.setTextColor(30, 41, 59) // slate-800
  doc.text(title, 14, 20)
  
  // Add subtitle if provided
  if (subtitle) {
    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(subtitle, 14, 28)
  }
  
  // Add timestamp
  const timestamp = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text(`Gerado em: ${timestamp}`, 14, subtitle ? 35 : 28)
  
  // Prepare table data
  const tableData = data.map(row => 
    columns.map(col => row[col.dataKey] || '-')
  )
  
  // Add table
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: tableData,
    startY: subtitle ? 42 : 35,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246], // blue-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85] // slate-700
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    margin: { left: 14, right: 14 }
  })
  
  // Add footer with page numbers
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }
  
  // Download file
  const finalFilename = filename || `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`
  doc.save(finalFilename)
}

// Specific export functions for common use cases

export function exportAtletasToPDF(atletas: any[], academiaName?: string) {
  exportToPDF({
    title: 'Relatório de Atletas',
    subtitle: academiaName ? `Academia: ${academiaName}` : undefined,
    columns: [
      { header: 'Nome', dataKey: 'nome' },
      { header: 'CPF', dataKey: 'cpf' },
      { header: 'Graduação', dataKey: 'graduacao' },
      { header: 'Data Nasc.', dataKey: 'data_nascimento' },
      { header: 'Status', dataKey: 'status' }
    ],
    data: atletas.map(a => ({
      ...a,
      data_nascimento: a.data_nascimento 
        ? new Date(a.data_nascimento).toLocaleDateString('pt-BR')
        : '-'
    })),
    filename: 'atletas.pdf'
  })
}

export function exportAulasToPDF(aulas: any[], academiaName?: string) {
  exportToPDF({
    title: 'Relatório de Aulas',
    subtitle: academiaName ? `Academia: ${academiaName}` : undefined,
    columns: [
      { header: 'Nome', dataKey: 'name' },
      { header: 'Local', dataKey: 'location' },
      { header: 'Capacidade', dataKey: 'capacity' },
      { header: 'Dia da Semana', dataKey: 'day_name' },
      { header: 'Horário', dataKey: 'time_range' }
    ],
    data: aulas.map(a => ({
      ...a,
      day_name: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][a.day_of_week] || '-',
      time_range: `${a.start_time} - ${a.end_time}`
    })),
    filename: 'aulas.pdf'
  })
}

export function exportAcademiasToPDF(academias: any[], federacaoName?: string) {
  exportToPDF({
    title: 'Relatório de Academias',
    subtitle: federacaoName ? `Federação: ${federacaoName}` : undefined,
    columns: [
      { header: 'Nome', dataKey: 'nome' },
      { header: 'Sigla', dataKey: 'sigla' },
      { header: 'Cidade', dataKey: 'cidade' },
      { header: 'Estado', dataKey: 'estado' },
      { header: 'Status', dataKey: 'status' }
    ],
    data: academias,
    filename: 'academias.pdf'
  })
}
