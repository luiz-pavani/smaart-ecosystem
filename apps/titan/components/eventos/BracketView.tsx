'use client'

import { useState, useMemo } from 'react'
import { Trophy, Medal, Clock, User, Shield, ChevronDown, ChevronUp } from 'lucide-react'

interface MatchData {
  id: string
  rodada: number
  posicao: number
  match_number: number
  athlete1_registration_id: string | null
  athlete2_registration_id: string | null
  winner_registration_id: string | null
  resultado: string | null
  pontos_athlete1: { wazaari: number; shido: number } | null
  pontos_athlete2: { wazaari: number; shido: number } | null
  tipo: string
  status: string
  athlete1?: { id: string; dados_atleta: Record<string, unknown>; academia_id: string | null } | null
  athlete2?: { id: string; dados_atleta: Record<string, unknown>; academia_id: string | null } | null
}

interface SlotData {
  id: string
  rodada: number
  posicao: number
  registration_id: string | null
  is_bye: boolean
  seed_number: number | null
  registration?: { id: string; dados_atleta: Record<string, unknown>; academia_id: string | null } | null
}

interface Props {
  matches: MatchData[]
  slots: SlotData[]
  bracketType: string
  numRodadas: number
  onMatchClick?: (match: MatchData) => void
  readOnly?: boolean
}

function getAthleteName(dados: Record<string, unknown> | null | undefined): string {
  if (!dados) return '—'
  return (dados.nome_completo as string) || (dados.nome as string) || '—'
}

function getAthleteAcademia(dados: Record<string, unknown> | null | undefined): string {
  if (!dados) return ''
  return (dados.academia as string) || ''
}

const RESULTADO_LABELS: Record<string, string> = {
  'ippon': 'IPP',
  'waza-ari': 'WZA',
  'golden_score': 'GS',
  'hansoku-make': 'HM',
  'fusen-gachi': 'FG',
  'kiken-gachi': 'KG',
  'sogo-gachi': 'SG',
}

const STATUS_COLORS: Record<string, string> = {
  'pending': 'border-slate-700',
  'ready': 'border-cyan-500/50',
  'in_progress': 'border-yellow-500/50',
  'finished': 'border-green-500/50',
  'walkover': 'border-slate-600',
}

/** Single match card */
function MatchCard({
  match,
  slots,
  onClick,
  compact = false,
}: {
  match: MatchData
  slots: SlotData[]
  onClick?: () => void
  compact?: boolean
}) {
  const a1Data = match.athlete1?.dados_atleta || findAthleteData(match.athlete1_registration_id, slots)
  const a2Data = match.athlete2?.dados_atleta || findAthleteData(match.athlete2_registration_id, slots)

  const a1Name = getAthleteName(a1Data)
  const a2Name = getAthleteName(a2Data)
  const a1Acad = getAthleteAcademia(a1Data)
  const a2Acad = getAthleteAcademia(a2Data)

  const isWinner1 = match.winner_registration_id === match.athlete1_registration_id
  const isWinner2 = match.winner_registration_id === match.athlete2_registration_id
  const isBye = match.status === 'walkover'
  const isFinished = match.status === 'finished'

  const borderColor = STATUS_COLORS[match.status] || 'border-slate-700'

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border-2 ${borderColor} bg-slate-800/80 overflow-hidden transition-all ${
        onClick ? 'cursor-pointer hover:bg-slate-800 hover:scale-[1.02]' : ''
      } ${compact ? 'w-48' : 'w-56'}`}
    >
      {/* Match header */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-black/30 text-[10px] text-slate-500">
        <span>#{match.match_number}</span>
        {match.resultado && (
          <span className="font-bold text-amber-400">{RESULTADO_LABELS[match.resultado] || match.resultado}</span>
        )}
        {isBye && <span className="text-slate-600">BYE</span>}
        {match.status === 'ready' && <span className="text-cyan-400 font-medium">PRONTA</span>}
        {match.status === 'in_progress' && <span className="text-yellow-400 font-medium animate-pulse">AO VIVO</span>}
      </div>

      {/* Athlete 1 */}
      <div className={`flex items-center gap-2 px-2 py-1.5 border-b border-slate-700/50 ${
        isWinner1 ? 'bg-green-500/10' : isFinished && !isWinner1 ? 'opacity-50' : ''
      }`}>
        <div className="w-1.5 h-6 rounded-full bg-white/80 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className={`text-xs truncate ${isWinner1 ? 'text-white font-bold' : 'text-slate-300'}`}>
            {match.athlete1_registration_id ? a1Name : (isBye ? 'BYE' : 'TBD')}
          </div>
          {!compact && a1Acad && <div className="text-[10px] text-slate-500 truncate">{a1Acad}</div>}
        </div>
        {isWinner1 && <Trophy className="w-3 h-3 text-amber-400 flex-shrink-0" />}
        {match.pontos_athlete1 && isFinished && (
          <span className="text-[10px] text-slate-400 flex-shrink-0">
            {match.pontos_athlete1.wazaari}W {match.pontos_athlete1.shido}S
          </span>
        )}
      </div>

      {/* Athlete 2 */}
      <div className={`flex items-center gap-2 px-2 py-1.5 ${
        isWinner2 ? 'bg-green-500/10' : isFinished && !isWinner2 ? 'opacity-50' : ''
      }`}>
        <div className="w-1.5 h-6 rounded-full bg-blue-400/80 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className={`text-xs truncate ${isWinner2 ? 'text-white font-bold' : 'text-slate-300'}`}>
            {match.athlete2_registration_id ? a2Name : (isBye ? 'BYE' : 'TBD')}
          </div>
          {!compact && a2Acad && <div className="text-[10px] text-slate-500 truncate">{a2Acad}</div>}
        </div>
        {isWinner2 && <Trophy className="w-3 h-3 text-amber-400 flex-shrink-0" />}
        {match.pontos_athlete2 && isFinished && (
          <span className="text-[10px] text-slate-400 flex-shrink-0">
            {match.pontos_athlete2.wazaari}W {match.pontos_athlete2.shido}S
          </span>
        )}
      </div>
    </div>
  )
}

function findAthleteData(regId: string | null, slots: SlotData[]): Record<string, unknown> | null {
  if (!regId) return null
  const slot = slots.find(s => s.registration_id === regId)
  return slot?.registration?.dados_atleta || null
}

/** Round label */
function getRoundLabel(round: number, total: number): string {
  if (round === total) return 'Final'
  if (round === total - 1) return 'Semifinal'
  if (round === total - 2) return 'Quartas'
  return `Rodada ${round}`
}

/** Elimination bracket visualization */
function EliminationView({ matches, slots, numRodadas, onMatchClick }: Props) {
  const mainMatches = matches.filter(m => ['main', 'semifinal', 'final'].includes(m.tipo))
  const bronzeMatches = matches.filter(m => m.tipo === 'bronze')
  const repechageMatches = matches.filter(m => m.tipo === 'repechage')

  // Group main matches by round
  const roundGroups = useMemo(() => {
    const groups: Record<number, MatchData[]> = {}
    for (const m of mainMatches) {
      if (!groups[m.rodada]) groups[m.rodada] = []
      groups[m.rodada].push(m)
    }
    // Sort matches within each round by posicao
    for (const round of Object.keys(groups)) {
      groups[Number(round)].sort((a, b) => a.posicao - b.posicao)
    }
    return groups
  }, [mainMatches])

  const rounds = Object.keys(roundGroups).map(Number).sort((a, b) => a - b)

  return (
    <div>
      {/* Main bracket: horizontal scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 items-start min-w-max">
          {rounds.map(round => {
            const matchesInRound = roundGroups[round] || []
            const gap = Math.pow(2, round - 1) * 12 // Increasing gap per round
            return (
              <div key={round} className="flex flex-col items-center">
                <div className="text-xs font-bold text-slate-400 mb-3 uppercase">
                  {getRoundLabel(round, numRodadas)}
                </div>
                <div className="flex flex-col justify-around" style={{ gap: `${gap}px`, minHeight: `${matchesInRound.length * 80 + (matchesInRound.length - 1) * gap}px` }}>
                  {matchesInRound.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      slots={slots}
                      onClick={onMatchClick ? () => onMatchClick(match) : undefined}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Repechage section */}
      {repechageMatches.length > 0 && (
        <RepechageSection matches={repechageMatches} bronzeMatches={bronzeMatches} slots={slots} onMatchClick={onMatchClick} />
      )}

      {/* Bronze matches (non-repechage) */}
      {bronzeMatches.length > 0 && repechageMatches.length === 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="text-xs font-bold text-amber-400 mb-3 uppercase flex items-center gap-2">
            <Medal className="w-4 h-4" /> Disputa de Bronze
          </div>
          <div className="flex gap-4">
            {bronzeMatches.map(m => (
              <MatchCard key={m.id} match={m} slots={slots} onClick={onMatchClick ? () => onMatchClick(m) : undefined} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RepechageSection({
  matches,
  bronzeMatches,
  slots,
  onMatchClick,
}: {
  matches: MatchData[]
  bronzeMatches: MatchData[]
  slots: SlotData[]
  onMatchClick?: (m: MatchData) => void
}) {
  const [expanded, setExpanded] = useState(true)

  // Separate repechage A (posicao 100-199) and B (200-299)
  const repA = matches.filter(m => m.posicao >= 100 && m.posicao < 200).sort((a, b) => a.posicao - b.posicao)
  const repB = matches.filter(m => m.posicao >= 200 && m.posicao < 300).sort((a, b) => a.posicao - b.posicao)
  const bronzeA = bronzeMatches.find(m => m.posicao === 101)
  const bronzeB = bronzeMatches.find(m => m.posicao === 201)

  return (
    <div className="mt-6 pt-4 border-t border-white/10">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase mb-3 hover:text-amber-300">
        <Medal className="w-4 h-4" /> Repescagem IJF
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="space-y-4">
          {/* Repechage A */}
          {(repA.length > 0 || bronzeA) && (
            <div>
              <div className="text-[10px] text-slate-500 mb-2 uppercase">Repescagem A</div>
              <div className="flex gap-4 items-center overflow-x-auto">
                {repA.map(m => (
                  <MatchCard key={m.id} match={m} slots={slots} compact onClick={onMatchClick ? () => onMatchClick(m) : undefined} />
                ))}
                {bronzeA && (
                  <>
                    <div className="text-slate-600">→</div>
                    <div>
                      <div className="text-[10px] text-amber-400 mb-1 font-bold">BRONZE</div>
                      <MatchCard match={bronzeA} slots={slots} onClick={onMatchClick ? () => onMatchClick(bronzeA) : undefined} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Repechage B */}
          {(repB.length > 0 || bronzeB) && (
            <div>
              <div className="text-[10px] text-slate-500 mb-2 uppercase">Repescagem B</div>
              <div className="flex gap-4 items-center overflow-x-auto">
                {repB.map(m => (
                  <MatchCard key={m.id} match={m} slots={slots} compact onClick={onMatchClick ? () => onMatchClick(m) : undefined} />
                ))}
                {bronzeB && (
                  <>
                    <div className="text-slate-600">→</div>
                    <div>
                      <div className="text-[10px] text-amber-400 mb-1 font-bold">BRONZE</div>
                      <MatchCard match={bronzeB} slots={slots} onClick={onMatchClick ? () => onMatchClick(bronzeB) : undefined} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Round Robin view */
function RoundRobinView({ matches, slots, onMatchClick }: Props) {
  // Group by rodada
  const rounds = useMemo(() => {
    const groups: Record<number, MatchData[]> = {}
    for (const m of matches) {
      if (!groups[m.rodada]) groups[m.rodada] = []
      groups[m.rodada].push(m)
    }
    return groups
  }, [matches])

  // Standings
  const standings = useMemo(() => {
    const stats: Record<string, { regId: string; wins: number; losses: number; name: string; acad: string }> = {}

    // Initialize from slots
    for (const s of slots) {
      if (s.registration_id && !s.is_bye) {
        const name = getAthleteName(s.registration?.dados_atleta || null)
        const acad = getAthleteAcademia(s.registration?.dados_atleta || null)
        stats[s.registration_id] = { regId: s.registration_id, wins: 0, losses: 0, name, acad }
      }
    }

    for (const m of matches) {
      if (m.status === 'finished' && m.winner_registration_id) {
        if (stats[m.winner_registration_id]) stats[m.winner_registration_id].wins++
        const loserId = m.winner_registration_id === m.athlete1_registration_id
          ? m.athlete2_registration_id
          : m.athlete1_registration_id
        if (loserId && stats[loserId]) stats[loserId].losses++
      }
    }

    return Object.values(stats).sort((a, b) => b.wins - a.wins || a.losses - b.losses)
  }, [matches, slots])

  return (
    <div className="space-y-6">
      {/* Standings table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-black/20 border-b border-white/10">
          <h4 className="text-xs font-bold text-slate-400 uppercase">Classificacao</h4>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-xs text-slate-500">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Atleta</th>
              <th className="px-3 py-2 text-left">Academia</th>
              <th className="px-3 py-2 text-center">V</th>
              <th className="px-3 py-2 text-center">D</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.regId} className="border-b border-white/5">
                <td className="px-3 py-2 text-sm text-slate-400">{i + 1}</td>
                <td className="px-3 py-2 text-sm text-white font-medium">{s.name}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{s.acad}</td>
                <td className="px-3 py-2 text-center text-sm text-green-400 font-bold">{s.wins}</td>
                <td className="px-3 py-2 text-center text-sm text-red-400">{s.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Matches by round */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.keys(rounds).map(Number).sort((a, b) => a - b).map(round => (
          <div key={round}>
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase">Rodada {round}</div>
            <div className="space-y-2">
              {rounds[round].map(m => (
                <MatchCard key={m.id} match={m} slots={slots} compact onClick={onMatchClick ? () => onMatchClick(m) : undefined} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Main BracketView component */
export default function BracketView(props: Props) {
  const { bracketType } = props

  if (bracketType === 'round_robin') {
    return <RoundRobinView {...props} />
  }

  if (bracketType === 'group_stage_elimination') {
    // Group matches are tipo='group', elimination matches are 'main'/'semifinal'/'final'
    const groupMatches = props.matches.filter(m => m.tipo === 'group')
    const elimMatches = props.matches.filter(m => m.tipo !== 'group')

    return (
      <div className="space-y-6">
        {groupMatches.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" /> Fase de Grupos
            </h4>
            <RoundRobinView {...props} matches={groupMatches} />
          </div>
        )}
        {elimMatches.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Fase Eliminatoria
            </h4>
            <EliminationView {...props} matches={elimMatches} />
          </div>
        )}
      </div>
    )
  }

  // All elimination types (single, bronze, repechage, double)
  return <EliminationView {...props} />
}
