/**
 * CSV Parser utilities for batch imports
 */

export interface ParsedRow {
  row: number
  data: Record<string, string>
  errors: string[]
}

export interface ParseResult {
  headers: string[]
  rows: ParsedRow[]
  totalRows: number
  validRows: number
  invalidRows: number
}

/**
 * Parse CSV file and validate structure
 */
export function parseCSV(csv: string): ParseResult {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header and one data row')
  }

  // Parse headers (first line)
  const headers = parseCSVLine(lines[0])
  
  // Parse data rows
  const rows: ParsedRow[] = []
  let validRows = 0
  let invalidRows = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    try {
      const values = parseCSVLine(line)
      const data: Record<string, string> = {}
      const errors: string[] = []

      // Map values to headers
      headers.forEach((header, idx) => {
        data[header] = values[idx] || ''
      })

      // Validate that we have the right number of columns
      if (values.length !== headers.length) {
        errors.push(`Expected ${headers.length} columns, got ${values.length}`)
      }

      rows.push({
        row: i + 1,
        data,
        errors,
      })

      if (errors.length === 0) {
        validRows++
      } else {
        invalidRows++
      }
    } catch (error) {
      rows.push({
        row: i + 1,
        data: {},
        errors: [error instanceof Error ? error.message : 'Parse error'],
      })
      invalidRows++
    }
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    validRows,
    invalidRows,
  }
}

/**
 * Parse a single CSV line (handles quoted values)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  result.push(current.trim())

  return result
}

/**
 * Validate required fields in a row
 */
export function validateRequiredFields(
  data: Record<string, string>,
  requiredFields: string[]
): string[] {
  const errors: string[] = []

  requiredFields.forEach((field) => {
    if (!data[field] || !data[field].toString().trim()) {
      errors.push(`Campo obrigatório ausente: ${field}`)
    }
  })

  return errors
}

/**
 * Validate CPF format
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '')
  
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  let sum = 0
  let remainder

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false

  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false

  return true
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate date format (YYYY-MM-DD or DD/MM/YYYY)
 */
export function validateAndParseDate(dateStr: string): { valid: boolean; date?: Date } {
  let date: Date | null = null

  // Try YYYY-MM-DD format
  let match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`)
  }

  // Try DD/MM/YYYY format
  if (!date) {
    match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (match) {
      date = new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00`)
    }
  }

  if (!date || isNaN(date.getTime())) {
    return { valid: false }
  }

  return { valid: true, date }
}

/**
 * Normalize phone number
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`
  } else if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`
  }
  return phone
}

/**
 * Generate sample CSV template for athletes
 */
export function generateAtletaCSVTemplate(): string {
  return `nome_completo,cpf,data_nascimento,genero,email,celular,graduacao,dan_nivel
João Silva,123.456.789-00,1990-01-15,Masculino,joao@email.com,(85) 98888-1234,FAIXA PRETA,SHODAN
Maria Santos,987.654.321-11,1992-03-20,Feminino,maria@email.com,(85) 99999-5678,CINZA,
Pedro Costa,111.222.333-44,1995-06-10,Masculino,pedro@email.com,(85) 97777-3456,AZUL,`
}

/**
 * Generate sample CSV template for academies
 */
export function generateAcademiaCSVTemplate(): string {
  return `nome,sigla,cnpj,responsavel_nome,responsavel_cpf,responsavel_email,responsavel_telefone,endereco_cep,endereco_rua,endereco_numero,endereco_bairro,endereco_cidade,endereco_estado
Academia Força,FOR,00.000.000/0000-00,João Silva,123.456.789-00,joao@academia.com,(85) 98888-1234,60000-000,Rua das Flores,100,Centro,Fortaleza,CE
Academia Poder,POD,11.111.111/0000-11,Maria Santos,987.654.321-11,maria@academia.com,(85) 99999-5678,60015-000,Rua da Paz,250,Aldeota,Fortaleza,CE`
}
