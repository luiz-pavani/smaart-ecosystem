'use client'

import { useState } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'
import { parseCSV, ParseResult, validateRequiredFields, validateCPF, validateEmail, validateAndParseDate } from '@/lib/utils/csv-parser'
import FileUpload from './FileUpload'

export interface CSVImportField {
  name: string
  label: string
  required: boolean
  type: 'text' | 'email' | 'phone' | 'cpf' | 'date' | 'select'
  options?: { value: string; label: string }[]
  validator?: (value: string) => { valid: boolean; error?: string }
}

interface CSVImportProps {
  title: string
  description?: string
  fields: CSVImportField[]
  onImport: (rows: Array<Record<string, string>>) => Promise<{ success: boolean; message: string }>
  templateDownloadUrl?: string
}

export default function CSVImport({
  title,
  description,
  fields,
  onImport,
  templateDownloadUrl,
}: CSVImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [csvFile, setCSVFile] = useState<File | null>(null)

  const requiredFields = fields.filter(f => f.required).map(f => f.name)

  const handleFileSelect = (file: File) => {
    setCSVFile(file)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const csv = e.target?.result as string
        const result = parseCSV(csv)

        // Validate each row
        result.rows.forEach((row) => {
          const errors = validateRequiredFields(row.data, requiredFields)

          // Validate specific fields
          fields.forEach((field) => {
            const value = row.data[field.name]
            if (!value && !field.required) return

            if (field.type === 'cpf' && value) {
              if (!validateCPF(value)) {
                errors.push(`${field.label}: CPF inválido`)
              }
            } else if (field.type === 'email' && value) {
              if (!validateEmail(value)) {
                errors.push(`${field.label}: Email inválido`)
              }
            } else if (field.type === 'date' && value) {
              const dateResult = validateAndParseDate(value)
              if (!dateResult.valid) {
                errors.push(`${field.label}: Data em formato inválido (use YYYY-MM-DD ou DD/MM/YYYY)`)
              }
            } else if (field.validator && value) {
              const validationResult = field.validator(value)
              if (!validationResult.valid) {
                errors.push(`${field.label}: ${validationResult.error}`)
              }
            }
          })

          row.errors = errors
        })

        // Recalculate valid/invalid count
        const validRows = result.rows.filter(r => r.errors.length === 0).length
        const invalidRows = result.rows.filter(r => r.errors.length > 0).length

        setParseResult({
          ...result,
          validRows,
          invalidRows,
        })

        setStep('preview')
      }

      reader.readAsText(file)
    } catch (error) {
      alert(`Erro ao ler arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleImport = async () => {
    if (!parseResult) return

    setIsImporting(true)

    try {
      const validRows = parseResult.rows
        .filter(r => r.errors.length === 0)
        .map(r => r.data)

      const result = await onImport(validRows)
      setImportResult(result)
      setStep('result')
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao importar dados',
      })
      setStep('result')
    } finally {
      setIsImporting(false)
    }
  }

  const handleReset = () => {
    setStep('upload')
    setParseResult(null)
    setImportResult(null)
    setCSVFile(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {title}
        </h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="space-y-4">
          <FileUpload
            label="Selecione arquivo CSV"
            accept=".csv"
            maxSize={5}
            onFileSelect={handleFileSelect}
            disabled={false}
            showPreview={false}
          />

          {templateDownloadUrl && (
            <div className="flex items-center justify-center pt-4 border-t border-border">
              <a
                href={templateDownloadUrl}
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
              >
                <Download className="w-4 h-4" />
                Baixar template de exemplo
              </a>
            </div>
          )}
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && parseResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{parseResult.totalRows}</p>
              <p className="text-xs text-muted-foreground mt-1">Total de linhas</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{parseResult.validRows}</p>
              <p className="text-xs text-green-600 mt-1">Linhas válidas</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{parseResult.invalidRows}</p>
              <p className="text-xs text-red-600 mt-1">Linhas com erro</p>
            </div>
          </div>

          {/* Table Preview */}
          <div className="border border-border rounded-lg overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground w-12">Linha</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  {parseResult.headers.map((header) => (
                    <th key={header} className="px-4 py-3 text-left font-semibold text-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parseResult.rows.slice(0, 10).map((row) => (
                  <tr key={row.row} className={`border-b border-border ${
                    row.errors.length > 0 ? 'bg-red-500/5' : 'hover:bg-muted/50'
                  }`}>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.row}</td>
                    <td className="px-4 py-3">
                      {row.errors.length === 0 ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-red-600">
                            {row.errors.map((error, idx) => (
                              <div key={idx}>{error}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    {parseResult.headers.map((header) => (
                      <td key={header} className="px-4 py-3 text-foreground max-w-xs truncate">
                        {row.data[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parseResult.totalRows > 10 && (
            <p className="text-sm text-muted-foreground text-center">
              +{parseResult.totalRows - 10} linhas (mostrando os primeiros 10)
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-all"
            >
              Voltar
            </button>
            <button
              onClick={handleImport}
              disabled={parseResult.validRows === 0 || isImporting}
              className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Importar {parseResult.validRows} registros
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Result Step */}
      {step === 'result' && importResult && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            importResult.success
              ? 'bg-green-500/10 border border-green-200 dark:border-green-900'
              : 'bg-red-500/10 border border-red-200 dark:border-red-900'
          }`}>
            {importResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <p className={`font-medium ${importResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {importResult.message}
            </p>
          </div>

          <button
            onClick={handleReset}
            className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all"
          >
            Importar outro arquivo
          </button>
        </div>
      )}
    </div>
  )
}

// Icon component for download (since we might not have it in lucide)
function Download({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 2v16m0 0l-6-6m6 6l6-6M4 20h16"
      />
    </svg>
  )
}
