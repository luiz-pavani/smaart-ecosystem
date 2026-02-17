'use client'

import { Bell, Search, Menu, Info } from 'lucide-react'
import { useState } from 'react'
import { getVersionString } from '@/lib/version'

interface TopNavProps {
  user: any
  mobile?: boolean
}

export default function TopNav({ user, mobile = false }: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
        {/* Mobile: Logo + Menu */}
        {mobile && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-accent rounded-lg transition-all"
            >
              <Menu className="w-6 h-6 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">T</span>
              </div>
              <h1 className="text-lg font-bold text-foreground">Titan</h1>
            </div>
          </div>
        )}

        {/* Desktop: Search */}
        {!mobile && (
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar academias, atletas..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {mobile && (
            <button className="p-2 hover:bg-accent rounded-lg transition-all">
              <Search className="w-6 h-6 text-foreground" />
            </button>
          )}
          
          <button className="relative p-2 hover:bg-accent rounded-lg transition-all">
            <Bell className="w-6 h-6 text-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>

          {!mobile && (
            <div className="ml-2 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-all cursor-pointer">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {user?.email?.split('@')[0]}
              </span>
            </div>
          )}
        </div>

      {/* Version Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 px-6 py-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">
            {getVersionString()}
          </span>
        </div>
      </div>
    </header>
    </
    </header>
  )
}
