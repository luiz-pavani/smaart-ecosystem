'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ApprovalCards from '@/components/ApprovalCards'

interface ApprovalSectionProps {
  atletaId: string
  graduacao: string
  graduacaoAprovada: boolean | null
  nivelArbitragem: string | null
  arbitragemAprovada: boolean | null
  isFederacaoAdmin: boolean
}

export default function ApprovalSection(props: ApprovalSectionProps) {
  const router = useRouter()

  const handleApprovalChange = () => {
    // Refresh the page data
    router.refresh()
  }

  return (
    <ApprovalCards
      {...props}
      onApprovalChange={handleApprovalChange}
    />
  )
}
