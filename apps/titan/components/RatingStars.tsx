'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface RatingStarsProps {
  classId: string
  athleteId: string
  className?: string
  onRated?: (rating: number) => void
}

export function RatingStars({ classId, athleteId, className, onRated }: RatingStarsProps) {
  const [hover, setHover] = useState(0)
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (rating: number) => {
    setSelected(rating)
    setLoading(true)
    await fetch(`/api/aulas/${classId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId, rating }),
    })
    setLoading(false)
    setDone(true)
    onRated?.(rating)
  }

  if (done) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-4 h-4 ${s <= selected ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
        ))}
        <span className="text-xs text-gray-400 ml-1">Obrigado!</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {loading ? (
        <span className="text-xs text-gray-400">Salvando...</span>
      ) : (
        <>
          <span className="text-xs text-gray-400 mr-1">Avaliar:</span>
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => submit(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              <Star className={`w-4 h-4 transition-colors ${s <= (hover || selected) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500 hover:text-yellow-300'}`} />
            </button>
          ))}
        </>
      )}
    </div>
  )
}
