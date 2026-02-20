'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'

export default function FrequenciaAtletaPage() {
  const router = useRouter()
  const [month, setMonth] = useState('Fevereiro')

  // Mock data
  const attendanceData = [
    { date: '01', present: true },
    { date: '02', present: true },
    { date: '03', present: false },
    { date: '04', present: true },
    { date: '05', present: true },
    { date: '06', present: true },
    { date: '07', present: false },
    { date: '08', present: true },
    { date: '09', present: true },
    { date: '10', present: true },
    { date: '11', present: false },
    { date: '12', present: true },
    { date: '13', present: true },
    { date: '14', present: true },
    { date: '15', present: true },
    { date: '16', present: false },
    { date: '17', present: true },
    { date: '18', present: true },
    { date: '19', present: true },
  ]

  const presentCount = attendanceData.filter(a => a.present).length
  const percentage = Math.round((presentCount / attendanceData.length) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Frequência</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Presentes</p>
            <p className="text-3xl font-bold text-green-400">{presentCount}</p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Faltas</p>
            <p className="text-3xl font-bold text-red-400">{attendanceData.length - presentCount}</p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Porcentagem</p>
            <p className="text-3xl font-bold text-blue-400">{percentage}%</p>
          </div>
        </div>

        {/* Month */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">{month} 2026</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded text-sm text-gray-300 hover:bg-white/10 transition-colors">
                ←
              </button>
              <button className="px-3 py-1 rounded text-sm text-gray-300 hover:bg-white/10 transition-colors">
                →
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="grid grid-cols-7 gap-2">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs text-gray-400 py-2">
                {day}
              </div>
            ))}
            {attendanceData.map((day, idx) => (
              <div
                key={idx}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-all ${
                  day.present
                    ? 'bg-green-500/20 border border-green-500 text-green-400'
                    : 'bg-red-500/20 border border-red-500 text-red-400'
                }`}
              >
                {day.present ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
