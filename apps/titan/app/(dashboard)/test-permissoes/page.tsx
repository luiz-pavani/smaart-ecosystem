'use client'

import { useEffect, useState } from 'react'

export default function TestPermissoes() {
  const [result, setResult] = useState<string>('Loading...')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function test() {
      try {
        console.log('Fetching /api/permissoes...')
        const response = await fetch('/api/permissoes')
        
        console.log('Response status:', response.status)
        console.log('Response ok:', response.ok)
        
        const data = await response.json()
        console.log('Response data:', data)
        
        if (!response.ok) {
          setError(`API Error (${response.status}): ${data.error}`)
          setResult(`❌ ${data.error}`)
        } else {
          setResult(`✅ Success! Loaded ${data.usuarios?.length || 0} users`)
        }
      } catch (err) {
        setError(`Fetch error: ${err}`)
        setResult(`❌ Fetch Error`)
      }
    }

    test()
  }, [])

  return (
    <div className="p-8 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Test /api/permissoes</h1>
      
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <p className="text-lg font-semibold">{result}</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded">
          <p className="text-red-800 font-mono text-sm">{error}</p>
        </div>
      )}

      <div className="mt-4 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">Check console (F12) for detailed logs</p>
      </div>
    </div>
  )
}
