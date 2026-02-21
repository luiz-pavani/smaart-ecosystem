'use client'

import { Trash2, FileText, FileSpreadsheet, X, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface BulkActionsProps {
  selectedCount: number
  onClear: () => void
  onDelete?: () => Promise<void>
  onExportPDF?: () => void
  onExportExcel?: () => void
  customActions?: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    onClick: () => void
    variant?: 'primary' | 'danger' | 'default'
  }[]
}

export function BulkActions({
  selectedCount,
  onClear,
  onDelete,
  onExportPDF,
  onExportExcel,
  customActions = []
}: BulkActionsProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm(`Tem certeza que deseja excluir ${selectedCount} ${selectedCount === 1 ? 'item' : 'itens'}?`)) return
    
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-2xl border border-blue-400/30 px-6 py-4 flex items-center gap-4">
        {/* Counter */}
        <div className="flex items-center gap-2 pr-4 border-r border-white/20">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
            {selectedCount}
          </div>
          <span className="font-medium">
            {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Exportar PDF"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          )}

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Exportar Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
          )}

          {customActions.map((action, index) => {
            const Icon = action.icon
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                  action.variant === 'danger'
                    ? 'bg-red-500/80 hover:bg-red-600'
                    : action.variant === 'primary'
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </button>
            )
          })}

          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-2 bg-red-500/80 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Excluir selecionados"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </>
              )}
            </button>
          )}
        </div>

        {/* Clear */}
        <button
          onClick={onClear}
          className="ml-2 pl-4 border-l border-white/20 p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Limpar seleção"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
