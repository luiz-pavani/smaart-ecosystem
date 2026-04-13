'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AtletasFederacaoRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/portal/federacao/filiacoes')
  }, [router])
  return null
}
