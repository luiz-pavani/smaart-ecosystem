import { useState, useCallback, useMemo } from 'react'

export function useSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.has(item.id)),
    [items, selectedIds]
  )

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  const isAllSelected = useMemo(
    () => items.length > 0 && items.every(item => selectedIds.has(item.id)),
    [items, selectedIds]
  )

  const isSomeSelected = useMemo(
    () => items.some(item => selectedIds.has(item.id)) && !isAllSelected,
    [items, selectedIds, isAllSelected]
  )

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(item => item.id)))
    }
  }, [items, isAllSelected])

  const clear = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const select = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    isSelected,
    isAllSelected,
    isSomeSelected,
    toggle,
    toggleAll,
    clear,
    select
  }
}
