'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestPermissoes() {
  const [result, setResult] = useState<string>('Loading...')
  const [error, setError] = useState<string>('')
  const [debug, setDebug] = useState<Record<string, any>>({})

  useEffect(() => {
    async function test() {
      try {
        // Step 1: Check session
        console.log('1️⃣ Checking Supabase session...')
        const supabase = await createClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('Session:', session?.user?.email)
        console.log('Session error:', sessionError)

        setDebug(prev => ({
          ...prev,
          sessionEmail: session?.user?.email,
          sessionError: sessionError?.message
        }))

        if (!session) {
          setError('No active session - redirecting to login')
          setResult('❌ No session found')
          return
        }

        // Step 2: Fetch from API
        console.log('2️⃣ Fetching /api/permissoes...')
        const response = await fetch('/api/permissoes')
        
        console.log('Response status:', response.status)
        console.log('Response ok:', response.ok)
        console.log('Response headers:', {
          'content-type': response.headers.get('content-type'),
          'set-cookie': response.headers.get('set-cookie'),
        })
        
        const data = await response.json()
        console.log('Response data:', data)
        
        setDebug(prev => ({
          ...prev,
          apiStatus: response.status,
          apiOk: response.ok,
          apiData: data
        }))

        if (!response.ok) {
          setError(`API Error (${response.status}): ${JSON.stringify(data, null, 2)}`)
          setResult(`❌ ${data.error}`)
        } else {
          setResult(`✅ Success! Loaded ${data.usuarios?.length || 0} users, Perfil: ${data.perfilAtual?.role}`)
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        setError(`Fetch error: ${errMsg}`)
        setResult(`❌ Fetch Error`)
        console.error('Full error:', err)
      }
    }

    test()
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">Test /api/permissoes</h1>
        <p className="text-gray-600 mb-4">Diagnostic tool to debug permissions API</p>
        
        <div className="mb-4 p-4 bg-blue-50 rounded border-l-4 border-blue-500">
          <p className="text-lg font-semibold">{result}</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded border-l-4 border-red-500">
            <p className="text-sm text-red-600 font-mono">{error}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
          <h2 className="font-bold text-sm mb-3">Debug Info</h2>
          <pre className="text-xs overflow-auto bg-white p-2 rounded">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded">
          <p className="text-xs text-gray-600">📖 Open DevTools Console (F12) for full logs</p>
        </div>
      </div>
    </div>
  )
}
