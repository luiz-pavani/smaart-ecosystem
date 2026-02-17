import { useEffect, useState } from 'react'

export interface Column {
  id: string
  label: string
  width?: string
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'atleta', label: 'Atleta' },
  { id: 'registro', label: 'Registro' },
  { id: 'graduacao', label: 'Graduação' },
  { id: 'academia', label: 'Academia' },
  { id: 'lote', label: 'Lote' },
  { id: 'status-pagamento', label: 'Status/Pagamento' },
  { id: 'acoes', label: 'Ações' },
]

const STORAGE_KEY = 'atletasColumnOrder'

export function useColumnOrder() {
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setColumns(parsed)
      }
    } catch (error) {
      console.error('Error loading column order:', error)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage
  const saveOrder = (newColumns: Column[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newColumns))
      setColumns(newColumns)
    } catch (error) {
      console.error('Error saving column order:', error)
    }
  }

  // Move column to a new position
  const moveColumn = (fromIndex: number, toIndex: number) => {
    const newColumns = [...columns]
    const [removed] = newColumns.splice(fromIndex, 1)
    newColumns.splice(toIndex, 0, removed)
    saveOrder(newColumns)
  }

  // Reset to default
  const resetToDefault = () => {
    saveOrder(DEFAULT_COLUMNS)
  }

  // Show/hide columns (not implemented yet, can be added later)
  const toggleColumnVisibility = (columnId: string) => {
    // This could be extended to support hiding columns
  }

  return {
    columns,
    isLoaded,
    moveColumn,
    resetToDefault,
    saveOrder,
    toggleColumnVisibility,
  }
}
