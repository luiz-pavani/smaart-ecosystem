'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, LogIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'loading' | 'checking-in' | 'success' | 'already' | 'not-enrolled' | 'unauthenticated' | 'error'

export default function CheckinPublicPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const classId = params.classId as string
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const [status, setStatus] = useState<Status>('loading')
  const [className, setClassName] = useState('')
  const [athleteName, setAthleteName] = useState('')

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('unauthenticated'); return }

      // Get name and class name in parallel
      const [classRes, fedRes] = await Promise.all([
        supabase.from('classes').select('name').eq('id', classId).maybeSingle(),
        supabase.from('user_fed_lrsj').select('nome_completo').eq('stakeholder_id', user.id).maybeSingle(),
      ])
      if ((classRes.data as any)?.name) setClassName((classRes.data as any).name)
      if ((fedRes.data as any)?.nome_completo) setAthleteName((fedRes.data as any).nome_completo)

      // Check in
      setStatus('checking-in')
      const res = await fetch(`/api/aulas/${classId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })

      if (res.ok) {
        const json = await res.json()
        setStatus(json.already ? 'already' : 'success')
      } else if (res.status === 403) {
        setStatus('not-enrolled')
      } else {
        setStatus('error')
      }
    }
    run()
  }, [classId, date])

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-white">TITAN</div>
          <div className="text-sm text-gray-400 mt-1">Portal de Presença</div>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-center">
          {(status === 'loading' || status === 'checking-in') && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">Registrando presença...</p>
              {className && <p className="text-gray-400 text-sm mt-2">{className}</p>}
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-white font-bold text-xl mb-1">Presença confirmada!</p>
              {athleteName && <p className="text-green-300 font-medium">{athleteName}</p>}
              {className && <p className="text-gray-400 text-sm mt-1">{className}</p>}
              <p className="text-gray-500 text-xs mt-2 capitalize">{dateLabel}</p>
              <button
                onClick={() => router.push('/portal/atleta')}
                className="mt-6 w-full py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-colors text-sm font-medium"
              >
                Ir para o Portal
              </button>
            </>
          )}

          {status === 'already' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <p className="text-white font-bold text-xl mb-1">Já registrado!</p>
              {athleteName && <p className="text-blue-300 font-medium">{athleteName}</p>}
              {className && <p className="text-gray-400 text-sm mt-1">{className}</p>}
              <p className="text-gray-500 text-xs mt-2">Presença já foi marcada hoje</p>
              <button
                onClick={() => router.push('/portal/atleta')}
                className="mt-6 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors text-sm"
              >
                Ir para o Portal
              </button>
            </>
          )}

          {status === 'not-enrolled' && (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-white font-bold text-xl mb-1">Não matriculado</p>
              <p className="text-gray-400 text-sm mt-2">Você não está matriculado nesta turma.</p>
              <p className="text-gray-500 text-xs mt-1">Fale com sua academia.</p>
            </>
          )}

          {status === 'unauthenticated' && (
            <>
              <LogIn className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-white font-bold text-xl mb-2">Faça login primeiro</p>
              <p className="text-gray-400 text-sm">Entre na sua conta para registrar presença.</p>
              <button
                onClick={() => router.push(`/login?redirect=/checkin/${classId}?date=${date}`)}
                className="mt-6 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors text-sm font-medium"
              >
                Fazer Login
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-white font-bold text-xl mb-1">Erro ao registrar</p>
              <p className="text-gray-400 text-sm mt-2">Tente novamente.</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors text-sm"
              >
                Tentar novamente
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
