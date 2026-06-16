'use client'

import { useState } from 'react'
import { ArrowLeftRight, Loader2, Check, GripVertical } from 'lucide-react'

interface Slot {
  id: string
  rodada: number
  posicao: number
  registration_id: string | null
  is_bye: boolean
  seed_number: number | null
  registration?: {
    id: string
    dados_atleta: Record<string, unknown>
    academia_id: string | null
  } | null
}

interface Props {
  eventoId: string
  bracketId: string
  slots: Slot[]
  bracketStatus: string
  onAfterSwap?: () => Promise<void> | void
}

function getName(s: Slot): string {
  if (!s.registration_id) return s.is_bye ? 'BYE' : '— vazio'
  const d = s.registration?.dados_atleta || {}
  return (d.nome_completo as string) || (d.nome as string) || 'Atleta'
}

function getAcademia(s: Slot): string {
  const d = s.registration?.dados_atleta || {}
  return (d.academia as string) || ''
}

/**
 * Bracket editor — versão drag-and-drop nativa HTML5.
 *
 * Suporta 2 modos de interação:
 *   1. Drag-and-drop: arrasta slot e solta em cima de outro → swap.
 *   2. Click fallback: dois cliques sequenciais em 2 slots → swap.
 *      Útil em tablets onde drag pode ser inconsistente.
 *
 * BYE slots não são draggable nem alvo de drop (não há atleta pra trocar).
 * Bracket fora de status='draft' bloqueia todas as interações.
 */
export default function SlotEditor({ eventoId, bracketId, slots, bracketStatus, onAfterSwap }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const isLocked = bracketStatus !== 'draft'
  const rodada1Slots = slots
    .filter(s => s.rodada === 1)
    .sort((a, b) => a.posicao - b.posicao)

  const swap = async (slotAId: string, slotBId: string) => {
    if (slotAId === slotBId || busy) return
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch(
        `/api/eventos/${eventoId}/brackets/${bracketId}/swap-slots`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_a_id: slotAId, slot_b_id: slotBId }),
        }
      )
      const json = await res.json()
      if (res.ok) {
        setFeedback({ ok: true, msg: 'Atletas trocados' })
        setSelected(null)
        await onAfterSwap?.()
      } else {
        setFeedback({ ok: false, msg: json.error || 'Erro ao trocar' })
      }
    } finally {
      setBusy(false)
      setTimeout(() => setFeedback(null), 2500)
    }
  }

  const onDragStart = (e: React.DragEvent, slotId: string, slot: Slot) => {
    if (isLocked || busy || slot.is_bye) {
      e.preventDefault()
      return
    }
    setDragging(slotId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', slotId)
  }

  const onDragOver = (e: React.DragEvent, slotId: string, slot: Slot) => {
    if (isLocked || busy || slot.is_bye) return
    if (dragging && dragging !== slotId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOver(slotId)
    }
  }

  const onDragLeave = (slotId: string) => {
    if (dragOver === slotId) setDragOver(null)
  }

  const onDrop = (e: React.DragEvent, slotId: string, slot: Slot) => {
    e.preventDefault()
    setDragOver(null)
    if (isLocked || busy || slot.is_bye) return
    const dragSourceId = dragging || e.dataTransfer.getData('text/plain')
    setDragging(null)
    if (dragSourceId && dragSourceId !== slotId) {
      swap(dragSourceId, slotId)
    }
  }

  const onDragEnd = () => {
    setDragging(null)
    setDragOver(null)
  }

  // Click fallback (tablets, acessibilidade)
  const onClick = (slot: Slot) => {
    if (isLocked || busy || slot.is_bye) return
    if (!selected) {
      setSelected(slot.id)
    } else if (selected === slot.id) {
      setSelected(null)
    } else {
      swap(selected, slot.id)
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
            Editar seeding (rodada 1)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLocked
              ? 'Chave já está publicada/iniciada — edição bloqueada.'
              : 'Arraste um atleta sobre outro para trocar, ou clique em 2 atletas em sequência.'}
          </p>
        </div>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cancelar seleção
          </button>
        )}
      </div>

      {feedback && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-xs ${
          feedback.ok
            ? 'bg-green-500/10 border border-green-500/30 text-green-300'
            : 'bg-red-500/10 border border-red-500/30 text-red-300'
        }`}>
          {feedback.ok && <Check className="inline w-3 h-3 mr-1" />}
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rodada1Slots.map((s) => {
          const isSelected = s.id === selected
          const isDragging = s.id === dragging
          const isDropTarget = s.id === dragOver
          const disabled = isLocked || busy || s.is_bye
          return (
            <div
              key={s.id}
              draggable={!disabled}
              onDragStart={(e) => onDragStart(e, s.id, s)}
              onDragOver={(e) => onDragOver(e, s.id, s)}
              onDragLeave={() => onDragLeave(s.id)}
              onDrop={(e) => onDrop(e, s.id, s)}
              onDragEnd={onDragEnd}
              onClick={() => onClick(s)}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all select-none ${
                isDragging
                  ? 'opacity-40'
                  : isDropTarget
                    ? 'bg-green-500/20 border-green-400 ring-2 ring-green-400 scale-[1.02]'
                    : isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/50 ring-1 ring-cyan-400'
                      : selected
                        ? 'bg-white/5 border-white/10 hover:border-cyan-500/30 cursor-pointer'
                        : disabled
                          ? 'bg-white/5 border-white/5 text-slate-500 opacity-50 cursor-not-allowed'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 cursor-grab active:cursor-grabbing'
              }`}
            >
              <div className="flex items-center gap-2">
                {!disabled && (
                  <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                <span className="text-[10px] font-mono text-slate-500 shrink-0 w-6">
                  #{s.posicao + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-white truncate">{getName(s)}</div>
                  {getAcademia(s) && (
                    <div className="text-[10px] text-slate-400 truncate">{getAcademia(s)}</div>
                  )}
                </div>
                {busy && (isSelected || isDragging) && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
