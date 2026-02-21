import * as XLSX from 'xlsx'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
}

export interface ExcelExportOptions {
  title: string
  columns: ExcelColumn[]
  data: any[]
  filename?: string
  sheetName?: string
}

export function exportToExcel(options: ExcelExportOptions) {
  const { title, columns, data, filename, sheetName } = options
  
  // Prepare worksheet data with headers
  const wsData = [
    columns.map(col => col.header),
    ...data.map(row => columns.map(col => row[col.key] || ''))
  ]
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }))
  
  // Style header row (if supported)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!ws[cellAddress]) continue
    ws[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "3B82F6" } },
      alignment: { horizontal: "center" }
    }
  }
  
  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Dados')
  
  // Add metadata
  wb.Props = {
    Title: title,
    Author: 'SMAART PRO',
    CreatedDate: new Date()
  }
  
  // Download file
  const finalFilename = filename || `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.xlsx`
  XLSX.writeFile(wb, finalFilename)
}

export function exportToCSV(options: ExcelExportOptions) {
  const { title, columns, data, filename } = options
  
  // Prepare CSV data
  const headers = columns.map(col => col.header).join(',')
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key] || ''
      // Escape values containing commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  )
  
  const csvContent = [headers, ...rows].join('\n')
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  const finalFilename = filename || `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`
  link.setAttribute('href', url)
  link.setAttribute('download', finalFilename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Specific export functions for common use cases

export function exportAtletasToExcel(atletas: any[], academiaName?: string) {
  exportToExcel({
    title: 'Relatório de Atletas',
    columns: [
      { header: 'Nome', key: 'nome', width: 25 },
      { header: 'CPF', key: 'cpf', width: 15 },
      { header: 'Graduação', key: 'graduacao', width: 20 },
      { header: 'Data Nascimento', key: 'data_nascimento', width: 15 },
      { header: 'Status', key: 'status', width: 12 }
    ],
    data: atletas.map(a => ({
      ...a,
      data_nascimento: a.data_nascimento 
        ? new Date(a.data_nascimento).toLocaleDateString('pt-BR')
        : '-'
    })),
    filename: 'atletas.xlsx',
    sheetName: 'Atletas'
  })
}

export function exportAulasToExcel(aulas: any[], academiaName?: string) {
  exportToExcel({
    title: 'Relatório de Aulas',
    columns: [
      { header: 'Nome', key: 'name', width: 25 },
      { header: 'Local', key: 'location', width: 20 },
      { header: 'Capacidade', key: 'capacity', width: 12 },
      { header: 'Dia da Semana', key: 'day_name', width: 15 },
      { header: 'Horário Início', key: 'start_time', width: 12 },
      { header: 'Horário Fim', key: 'end_time', width: 12 }
    ],
    data: aulas.map(a => ({
      ...a,
      day_name: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][a.day_of_week] || '-'
    })),
    filename: 'aulas.xlsx',
    sheetName: 'Aulas'
  })
}

export function exportAcademiasToExcel(academias: any[], federacaoName?: string) {
  exportToExcel({
    title: 'Relatório de Academias',
    columns: [
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'Sigla', key: 'sigla', width: 10 },
      { header: 'Cidade', key: 'cidade', width: 20 },
      { header: 'Estado', key: 'estado', width: 8 },
      { header: 'Status', key: 'status', width: 12 }
    ],
    data: academias,
    filename: 'academias.xlsx',
    sheetName: 'Academias'
  })
}
