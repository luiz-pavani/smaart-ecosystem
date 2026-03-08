import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ 
  message, 
  onRetry,
  className = '' 
}: ErrorStateProps) {
  return (
    <div className={`bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center ${className}`}>
      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <p className="text-red-200 font-medium mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
