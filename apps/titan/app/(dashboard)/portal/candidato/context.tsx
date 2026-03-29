'use client'

import { createContext, useContext } from 'react'

interface CandidatoContextValue {
  isAdmin: boolean
}

export const CandidatoContext = createContext<CandidatoContextValue>({ isAdmin: false })
export const useCandidato = () => useContext(CandidatoContext)
