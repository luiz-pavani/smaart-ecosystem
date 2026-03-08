import { Trophy } from 'lucide-react'

interface TopListItem {
  name: string
  value: number | string
  subtitle?: string
}

interface TopListProps {
  title: string
  items: TopListItem[]
  valueLabel?: string
}

export function TopList({ title, items, valueLabel }: TopListProps) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum dado disponível</p>
        ) : (
          items.map((item, index) => (
            <div 
              key={index} 
              className="group flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-200 hover:scale-[1.01] cursor-default"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-transform duration-200 group-hover:scale-110 ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                  index === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/40' :
                  index === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' :
                  'bg-white/10 text-gray-400 border border-white/20'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="text-white font-medium group-hover:text-white transition-colors">{item.name}</p>
                  {item.subtitle && (
                    <p className="text-gray-400 text-xs mt-0.5">{item.subtitle}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold tabular-nums">{item.value}</p>
                {valueLabel && (
                  <p className="text-gray-400 text-xs">{valueLabel}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
