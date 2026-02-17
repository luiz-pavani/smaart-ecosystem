'use client'

import { useState } from 'react'
import { GripVertical, RotateCcw } from 'lucide-react'
import type { Column } from '@/hooks/useColumnOrder'

interface ColumnOrderDialogProps {
  columns: Column[]
  isOpen: boolean
  onClose: () => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onReset: () => void
}

export default function ColumnOrderDialog({
  columns,
  isOpen,
  onClose,
  onReorder,
  onReset,
}: ColumnOrderDialogProps) {
  const [draggedFrom, setDraggedFrom] = useState<number | null>(null)
  const [draggedOver, setDraggedOver] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedFrom(index)
  }

  const handleDragOver = (index: number) => {
    setDraggedOver(index)
  }

  const handleDrop = (toIndex: number) => {
    if (draggedFrom !== null && draggedFrom !== toIndex) {
      onReorder(draggedFrom, toIndex)
    }
    setDraggedFrom(null)
    setDraggedOver(null)
  }

  const handleDragEnd = () => {
    setDraggedFrom(null)
    setDraggedOver(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full m-4">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Reordenar Colunas</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
          {columns.map((column, index) => (
            <div
              key={column.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={() => handleDragOver(index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-move transition-colors ${
                draggedFrom === index
                  ? 'bg-primary/10 border-primary opacity-50'
                  : draggedOver === index
                    ? 'bg-primary/5 border-primary'
                    : 'bg-muted/50 border-border hover:border-primary/50'
              }`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">{column.label}</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {index + 1}
              </span>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-border flex gap-2">
          <button
            onClick={() => {
              onReset()
              onClose()
            }}
            className="flex-1 bg-muted text-muted-foreground hover:bg-muted/80 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
