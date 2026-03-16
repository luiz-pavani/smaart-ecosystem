'use client'

import { Search } from 'lucide-react'
import { useState, useEffect } from 'react'

export function SearchShortcut() {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.indexOf('Mac') === 0)
  }, [])

  return (
    <button
      onClick={() => {
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          ctrlKey: true,
          bubbles: true
        })
        document.dispatchEvent(event)
      }}
      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 hover:text-white transition-all group"
      title="Busca rápida (Cmd+K ou Ctrl+K)"
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline text-sm">Buscar</span>
      <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs bg-white/10 border border-white/10 rounded group-hover:bg-white/20 transition-colors">
        {isMac ? '⌘' : 'Ctrl'}K
      </kbd>
    </button>
  )
}
