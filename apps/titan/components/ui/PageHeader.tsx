'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  actions?: ReactNode
  showBackButton?: boolean
}

export function PageHeader({ 
  title, 
  subtitle, 
  backTo, 
  actions,
  showBackButton = true 
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backTo) {
      router.push(backTo)
    } else {
      router.back()
    }
  }

  return (
    <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span>Voltar</span>
              </button>
            )}
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="text-gray-400 mt-1 max-w-2xl">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="ml-4 flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
