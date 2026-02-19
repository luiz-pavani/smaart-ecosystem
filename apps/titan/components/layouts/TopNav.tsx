'use client'

import { Bell, Search, Menu, Info, Settings, LogOut, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { getVersionString } from '@/lib/version'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface TopNavProps {
  user: any
  mobile?: boolean
}

export default function TopNav({ user, mobile = false }: TopNavProps) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    const supabase = await createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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
            
            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-accent rounded-lg transition-all"
              >
                <Bell className="w-6 h-6 text-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">Notificações</h3>
                  </div>
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma notificação no momento
                  </div>
                </div>
              )}
            </div>

            {/* User Menu Dropdown */}
            {!mobile && (
              <div className="relative ml-2" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-all"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {user?.email?.[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {user?.email?.split('@')[0]}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
                    <div className="p-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user?.email}
                      </p>
                      <p className="text-xs text-muted-foreground">Master Access</p>
                    </div>
                    
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          router.push('/configuracoes')
                        }}
                        className="w-full px-4 py-2 text-sm text-left hover:bg-accent transition-all flex items-center gap-3"
                      >
                        <Settings className="w-4 h-4" />
                        Configurações
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-sm text-left hover:bg-accent text-destructive transition-all flex items-center gap-3"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Version Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 px-6 py-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">
            {getVersionString()}
          </span>
        </div>
      </div>
    </>
  )
}
