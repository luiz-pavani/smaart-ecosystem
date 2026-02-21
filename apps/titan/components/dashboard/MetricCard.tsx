import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  onClick?: () => void
}

const colorClasses = {
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  green: 'bg-green-500/20 text-green-400 border-green-500/50',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  red: 'bg-red-500/20 text-red-400 border-red-500/50',
}

export function MetricCard({ title, value, icon: Icon, trend, color = 'blue', onClick }: MetricCardProps) {
  const isClickable = Boolean(onClick)
  const Wrapper = isClickable ? 'button' : 'div'

  return (
    <Wrapper
      className={`bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 transition-all ${
        isClickable ? 'hover:border-white/30 hover:bg-white/10 cursor-pointer text-left' : 'hover:border-white/20'
      }`}
      onClick={onClick}
      {...(isClickable ? { type: 'button' } : {})}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} border flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`text-xs px-2 py-1 rounded-full ${trend.value >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </div>
        )}
      </div>
      <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>
    </Wrapper>
  )
}
