'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function AulasAcademiaPage() {
  const router = useRouter()

  const aulas = [
    { id: 1, dia: 'Segunda', horario: '18:00-19:30', professor: 'Prof. Carlos', sala: 'A1', alunos: 15 },
    { id: 2, dia: 'Segunda', horario: '19:30-21:00', professor: 'Prof. Ana', sala: 'B1', alunos: 12 },
    { id: 3, dia: 'Quarta', horario: '18:00-19:30', professor: 'Prof. Carlos', sala: 'A1', alunos: 18 },
    { id: 4, dia: 'Quarta', horario: '19:30-21:00', professor: 'Prof. Ana', sala: 'B1', alunos: 10 },
    { id: 5, dia: 'Sexta', horario: '18:00-19:30', professor: 'Prof. Carlos', sala: 'A1', alunos: 16 },
    { id: 6, dia: 'Sábado', horario: '09:00-10:30', professor: 'Prof. Ana', sala: 'A1', alunos: 20 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Aulas & Horários</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Add Button */}
        <button className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all mb-8">
          <Plus className="w-5 h-5" />
          Nova Aula
        </button>

        {/* Schedule by Day */}
        <div className="space-y-6">
          {['Segunda', 'Quarta', 'Sexta', 'Sábado'].map(dia => (
            <div key={dia} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
              <div className="bg-white/5 px-6 py-3 border-b border-white/10">
                <h3 className="font-semibold text-white">{dia}</h3>
              </div>
              <div className="divide-y divide-white/5">
                {aulas.filter(a => a.dia === dia).map(aula => (
                  <div key={aula.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div>
                      <p className="font-semibold text-white">{aula.horario}</p>
                      <p className="text-gray-400 text-sm">Prof. {aula.professor.split('. ')[1]} • Sala {aula.sala} • {aula.alunos} alunos</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
