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
 * Parse CSV file and validate structure.
 *
 * Parser char-a-char respeitando RFC 4180: campos entre aspas duplas podem
 * conter vírgulas E quebras de linha. O parser anterior dava split('\n')
 * primeiro e quebrava linhas válidas com \n interno (Smoothcomp gera CSVs com
 * \n dentro de campos como GRADUAÇÃO).
 */
export function parseCSV(csv: string): ParseResult {
  const normalized = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const records: string[][] = []
  let current = ''
  let row: string[] = []
  let insideQuotes = false

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]
    const nextChar = normalized[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      row.push(current)
      current = ''
    } else if (char === '\n' && !insideQuotes) {
      row.push(current)
      records.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current)
    records.push(row)
  }

  const cleaned = records.filter((r) => r.some((cell) => cell.trim().length > 0))

  if (cleaned.length < 2) {
    throw new Error('CSV must contain at least a header and one data row')
  }

  const headers = cleaned[0].map((h) => h.trim())

  const rows: ParsedRow[] = []
  let validRows = 0
  let invalidRows = 0

  for (let i = 1; i < cleaned.length; i++) {
    const values = cleaned[i].map((v) => v.trim())
    const data: Record<string, string> = {}
    const errors: string[] = []

    headers.forEach((header, idx) => {
      data[header] = values[idx] || ''
    })

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
