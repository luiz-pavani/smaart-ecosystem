import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
}

export function LoadingState({ 
  message = 'Carregando...', 
  className = '',
  size = 'md'
}: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-gray-300 mb-3`} />
      {message && (
        <p className="text-gray-400 text-sm">{message}</p>
      )}
    </div>
  )
}
