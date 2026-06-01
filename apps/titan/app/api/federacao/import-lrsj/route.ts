import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { parseCSV } from '@/lib/utils/csv-parser'
import {
  transformSmooothcompRow,
  normalizeAcademiaName,
  type SmooothcompRow,
  type AcademiaRow,
} from '@/lib/import/smoothcomp'

// Import processa 1300+ atletas com createUser + upsert — precisa de timeout maior.
// Vercel Pro permite até 300s; Hobby fica limitado a 60s.
export const maxDuration = 300
export const runtime = 'nodejs'

const LRSJ_FED_ID_INT = 1
const LRSJ_FED_UUID = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'

interface CsvRowData {
  [key: string]: string
}

function parseDateForCompare(s: string | null | undefined): number {
  if (!s) return 0
  const t = Date.parse(s)
  return Number.isNaN(t) ? 0 : t
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Authorize: master_access/admin/master (any federation) OR federacao_admin
    // restricted to LRSJ.
    const { data: stakeholder } = await supabaseAdmin
      .from('stakeholders')
      .select('role, federacao_id')
      .eq('id', user.id)
      .single()

    const role = stakeholder?.role ?? ''
    const isAuthorized =
      ['master_access', 'admin', 'master'].includes(role) ||
      (role === 'federacao_admin' && stakeholder?.federacao_id === LRSJ_FED_UUID)

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Acesso restrito a administradores' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('csv_file') as File | null
    const dryRun = formData.get('dry_run') === 'true'
    const onlyApproved = formData.get('only_approved') !== 'false' // default true

    if (!file) {
      return NextResponse.json({ error: 'Arquivo CSV não enviado' }, { status: 400 })
    }

    const csvText = await file.text()

    let parsed
    try {
      parsed = parseCSV(csvText)
    } catch (err) {
      return NextResponse.json(
        { error: `Erro ao parsear CSV: ${err instanceof Error ? err.message : 'desconhecido'}` },
        { status: 400 }
      )
    }

    if (parsed.totalRows === 0) {
      return NextResponse.json({ error: 'CSV sem linhas de dados' }, { status: 400 })
    }

    // Tally status counts (over the full CSV, before any filtering)
    const member_status_counts: Record<string, number> = {}
    const plan_status_counts: Record<string, number> = {}
    for (const r of parsed.rows) {
      const ms = ((r.data as CsvRowData)['Member status'] || '').trim().toLowerCase() || '(vazio)'
      const ps = ((r.data as CsvRowData)['Plan status'] || '').trim().toLowerCase() || '(vazio)'
      member_status_counts[ms] = (member_status_counts[ms] ?? 0) + 1
      plan_status_counts[ps] = (plan_status_counts[ps] ?? 0) + 1
    }

    // Filter by Member status if requested
    type ParsedRow = (typeof parsed.rows)[number]
    const filteredRows: ParsedRow[] = onlyApproved
      ? parsed.rows.filter(
          (r) => ((r.data as CsvRowData)['Member status'] || '').trim().toLowerCase() === 'approved'
        )
      : parsed.rows

    const filtered_out_by_status = parsed.rows.length - filteredRows.length

    // Dedup por Member No (chave única do Smoothcomp). Antes era por email,
    // o que colapsava famílias/projetos sociais que compartilham 1 email em
    // 1 único atleta — bug que perdia 108 atletas reais da base LRSJ.
    const by_member_no = new Map<string, ParsedRow>()
    let no_name = 0
    let no_email = 0
    let no_member_no = 0
    for (const r of filteredRows) {
      const data = r.data as CsvRowData
      const nome = (data['Name'] || '').trim()
      if (!nome) {
        no_name++
        continue
      }
      const member_no = (data['Member No'] || '').trim()
      if (!member_no) {
        no_member_no++
        continue
      }
      const prev = by_member_no.get(member_no)
      if (!prev) {
        by_member_no.set(member_no, r)
      } else {
        const prevExp = parseDateForCompare((prev.data as CsvRowData)['Expire date'])
        const curExp = parseDateForCompare(data['Expire date'])
        if (curExp >= prevExp) by_member_no.set(member_no, r)
      }
    }
    const deduped_rows = Array.from(by_member_no.values())
    const duplicates_collapsed = filteredRows.length - no_name - no_member_no - deduped_rows.length

    // Para fins de telemetria, conta quantos atletas usam email compartilhado.
    const email_counts = new Map<string, number>()
    for (const r of deduped_rows) {
      const email = ((r.data as CsvRowData)['Email'] || '').trim().toLowerCase()
      if (email) email_counts.set(email, (email_counts.get(email) || 0) + 1)
    }
    const shared_emails = Array.from(email_counts.values()).filter((n) => n > 1).reduce((s, n) => s + n, 0)

    // Load LRSJ academies and build normalized lookup map
    const { data: academiasData } = await supabaseAdmin
      .from('academias')
      .select('id, nome')
      .eq('federacao_id', LRSJ_FED_UUID)
      .limit(500)

    const academia_map = new Map<string, AcademiaRow>(
      (academiasData ?? []).map((a) => [
        normalizeAcademiaName(a.nome),
        a as AcademiaRow,
      ])
    )

    // Resolve existing stakeholders por Member No (chave estável) ou email (fallback).
    // member_no_map: Member No → stakeholder.id (autoritativo)
    // email_to_stakeholder: email → stakeholder.id (fallback pra atletas legados sem Member No)
    const all_member_nos = deduped_rows.map((r) => (r.data as CsvRowData)['Member No'].trim())
    const all_emails = deduped_rows.map((r) => (r.data as CsvRowData)['Email'].trim().toLowerCase()).filter(Boolean)

    const member_no_map = new Map<string, string>()
    const email_to_stakeholder = new Map<string, string>()

    for (let i = 0; i < all_member_nos.length; i += 100) {
      const slice = all_member_nos.slice(i, i + 100)
      const { data: sh } = await supabaseAdmin
        .from('stakeholders')
        .select('id, smoothcomp_member_no')
        .in('smoothcomp_member_no', slice)
      for (const s of sh ?? []) {
        if (s.smoothcomp_member_no) member_no_map.set(s.smoothcomp_member_no, s.id)
      }
    }
    for (let i = 0; i < all_emails.length; i += 100) {
      const slice = all_emails.slice(i, i + 100)
      const { data: sh } = await supabaseAdmin
        .from('stakeholders')
        .select('id, email, smoothcomp_member_no')
        .in('email', slice)
      for (const s of sh ?? []) {
        // Só vincula por email se ainda não tem Member No (não sobrescreve match autoritativo)
        if (s.email && !s.smoothcomp_member_no) email_to_stakeholder.set(s.email.toLowerCase(), s.id)
      }
    }

    // stakeholder_resolution: Member No → { id, source: 'existing'|'new', synthetic_email?: boolean }
    // Resolve qual stakeholder cada atleta vai usar e quais precisam ser criados.
    interface Resolution {
      id: string
      source: 'existing_by_member_no' | 'existing_by_email' | 'new'
      synthetic_email?: string
    }
    const resolutions = new Map<string, Resolution>()
    const new_stakeholder_inserts: Array<{
      id: string
      email: string
      nome_completo: string
      nome_usuario: string
      role: string
      funcao: string
      smoothcomp_member_no: string
    }> = []

    // 1ª passada: detecta emails compartilhados no batch atual (Smoothcomp permite,
    // mas auth.users.email é único — precisa de email sintético pra evitar colisão).
    const email_batch_counts = new Map<string, number>()
    for (const r of deduped_rows) {
      const email = ((r.data as CsvRowData)['Email'] || '').trim().toLowerCase()
      if (email) email_batch_counts.set(email, (email_batch_counts.get(email) || 0) + 1)
    }
    const used_synthetic = new Set<string>()

    for (const r of deduped_rows) {
      const data = r.data as CsvRowData
      const member_no = data['Member No'].trim()
      const email = (data['Email'] || '').trim().toLowerCase()
      const nome = (data['Name'] || '').trim()

      // 1. Já existe stakeholder com esse Member No? → usa
      const existing_by_no = member_no_map.get(member_no)
      if (existing_by_no) {
        resolutions.set(member_no, { id: existing_by_no, source: 'existing_by_member_no' })
        continue
      }

      // 2. Atleta novo. Decide email final: real ou sintético.
      // Sintético é necessário quando o email é compartilhado dentro do CSV atual
      // (família/projeto social no Smoothcomp).
      let final_email = email
      let synthetic = false
      if (!email || (email_batch_counts.get(email) || 0) > 1) {
        final_email = `smoothcomp-${member_no}@import.lrsj.local`
        synthetic = true
      }

      // 3. Email real existe em outro stakeholder (legado sem Member No)?
      //    Só usa esse vínculo se o email NÃO é sintético — senão criaríamos
      //    múltiplos atletas falsos vinculados ao primeiro que pegou o email.
      if (!synthetic) {
        const existing_by_email = email_to_stakeholder.get(email)
        if (existing_by_email) {
          resolutions.set(member_no, { id: existing_by_email, source: 'existing_by_email' })
          continue
        }
      }

      // 4. Cria stakeholder novo
      if (used_synthetic.has(final_email)) {
        // segurança extra contra colisão de email sintético (não deveria acontecer)
        final_email = `smoothcomp-${member_no}-${crypto.randomUUID().slice(0, 6)}@import.lrsj.local`
      }
      used_synthetic.add(final_email)

      const id = crypto.randomUUID()
      const localPart = final_email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '_').slice(0, 40)
      const nome_usuario = `${localPart}_${id.replace(/-/g, '').slice(0, 6)}`
      new_stakeholder_inserts.push({
        id,
        email: final_email,
        nome_completo: nome,
        nome_usuario,
        role: 'atleta',
        funcao: 'ATLETA',
        smoothcomp_member_no: member_no,
      })
      resolutions.set(member_no, {
        id,
        source: 'new',
        synthetic_email: synthetic ? email || undefined : undefined,
      })
    }

    // Transform every (deduped) row — usa o stakeholder_id resolvido
    const results: ReturnType<typeof transformSmooothcompRow>[] = []
    for (const parsedRow of deduped_rows) {
      const data = parsedRow.data as CsvRowData
      const member_no = data['Member No'].trim()
      const stakeholder_id = resolutions.get(member_no)?.id ?? null
      const result = transformSmooothcompRow(
        data as unknown as SmooothcompRow,
        academia_map,
        LRSJ_FED_ID_INT,
        stakeholder_id
      )
      results.push(result)
    }

    // Drop rows without stakeholder_id (defensive — should be 0 after auto-create)
    const without_stakeholder = results.filter((r) => !r.row.stakeholder_id).length
    const importable = results.filter((r) => r.row.stakeholder_id)

    const total_warnings = results.reduce((acc, r) => acc + r.warnings.length, 0)
    const academias_nao_encontradas = [
      ...new Set(
        results
          .flatMap((r) => r.warnings)
          .filter((w) => w.includes('Academia não encontrada'))
          .map((w) => w.match(/"([^"]+)"/)?.[1] ?? w)
      ),
    ]

    if (dryRun) {
      const preview = importable.slice(0, 50).map((r) => ({
        nome_completo: r.row.nome_completo,
        email: r.row.email,
        academia: r.academia_nome,
        academia_id: r.row.academia_id,
        kyu_dan_id: r.row.kyu_dan_id,
        status_membro: r.row.status_membro,
        status_plano: r.row.status_plano,
        lote_id: r.row.lote_id,
        warnings: r.warnings,
      }))

      return NextResponse.json({
        dry_run: true,
        csv_total: parsed.rows.length,
        only_approved: onlyApproved,
        filtered_out_by_status,
        skipped: { no_name, no_member_no, without_stakeholder },
        duplicates_collapsed,
        shared_emails,
        to_insert: importable.length,
        new_stakeholders: new_stakeholder_inserts.length,
        new_stakeholders_with_synthetic_email: new_stakeholder_inserts.filter((s) => s.email.endsWith('@import.lrsj.local')).length,
        member_status_counts,
        plan_status_counts,
        total_warnings,
        academias_nao_encontradas,
        preview,
      })
    }

    // Create missing stakeholders via Supabase Auth admin API — this triggers
    // the upsert_stakeholder_from_auth_user trigger which populates stakeholders
    // with the right defaults (funcao, nome_usuario) and satisfies the FK on
    // stakeholders.id → auth.users(id).
    let new_stakeholders_inserted = 0
    const new_stakeholder_errors: string[] = []
    // Paraleliza createUser em batches de 10 — sequencial leva ~22s, paralelo ~3s.
    const CREATE_CONCURRENCY = 10
    for (let i = 0; i < new_stakeholder_inserts.length; i += CREATE_CONCURRENCY) {
      const chunk = new_stakeholder_inserts.slice(i, i + CREATE_CONCURRENCY)
      const settled = await Promise.allSettled(
        chunk.map((s) =>
          supabaseAdmin.auth.admin.createUser({
            email: s.email,
            email_confirm: true,
            user_metadata: {
              full_name: s.nome_completo,
              username: s.nome_usuario,
              stakeholder_role: s.role,
            },
          })
        )
      )
      settled.forEach((p, idx) => {
        const s = chunk[idx]
        if (p.status === 'rejected') {
          new_stakeholder_errors.push(`${s.email}: ${p.reason instanceof Error ? p.reason.message : 'erro'}`)
          return
        }
        const { error } = p.value
        if (error) {
          new_stakeholder_errors.push(`${s.email}: ${error.message}`)
          return
        }
        new_stakeholders_inserted++
      })
    }
    // Refresh resolutions com IDs reais retornados pelo Supabase Auth (que
    // sobrescreve nosso UUID temporário). Lookup por email final (real ou sintético).
    if (new_stakeholders_inserted > 0) {
      const created_emails = new_stakeholder_inserts.map((s) => s.email)
      const email_to_real_id = new Map<string, string>()
      const email_to_member_no = new Map<string, string>()
      for (const s of new_stakeholder_inserts) email_to_member_no.set(s.email, s.smoothcomp_member_no)

      for (let i = 0; i < created_emails.length; i += 100) {
        const slice = created_emails.slice(i, i + 100)
        const { data: sh } = await supabaseAdmin
          .from('stakeholders')
          .select('id, email')
          .in('email', slice)
        for (const row of sh ?? []) {
          if (row.email) email_to_real_id.set(row.email.toLowerCase(), row.id)
        }
      }

      // Atualiza resolutions e gravar smoothcomp_member_no nos stakeholders criados
      // (o trigger de auth não conhece esse campo). Faz em batch.
      const updates_member_no: Array<{ id: string; member_no: string }> = []
      for (const [email, real_id] of email_to_real_id) {
        const member_no = email_to_member_no.get(email)
        if (!member_no) continue
        updates_member_no.push({ id: real_id, member_no })
        const res = resolutions.get(member_no)
        if (res) res.id = real_id
      }

      // Re-resolve stakeholder_id em todos os results — os IDs temporários
      // viraram inválidos quando o trigger do Supabase Auth sobrescreveu com IDs reais.
      results.forEach((r, idx) => {
        const data = deduped_rows[idx].data as CsvRowData
        const member_no = data['Member No'].trim()
        const newId = resolutions.get(member_no)?.id
        if (newId) r.row.stakeholder_id = newId
      })
    }

    // Bulk update: smoothcomp_member_no (backfill) + nome_completo (correção) em 1 RPC.
    // Inclui TODOS os atletas do CSV — a função no banco ignora updates redundantes.
    const bulk_payload = deduped_rows
      .map((r) => {
        const data = r.data as CsvRowData
        const member_no = data['Member No'].trim()
        const nome_csv = (data['Name'] || '').trim()
        const res = resolutions.get(member_no)
        if (!res) return null
        return { id: res.id, member_no, nome_completo: nome_csv }
      })
      .filter(Boolean)

    let backfill_member_no = 0
    let names_updated = 0
    if (bulk_payload.length > 0) {
      const { data: bulkResult, error: bulkErr } = await supabaseAdmin.rpc(
        'bulk_update_stakeholders_from_smoothcomp',
        { p_updates: bulk_payload }
      )
      if (!bulkErr && bulkResult && bulkResult[0]) {
        backfill_member_no = Number(bulkResult[0].updated_count) - Number(bulkResult[0].names_changed)
        names_updated = Number(bulkResult[0].names_changed)
      }
    }

    // Upsert user_fed_lrsj via stakeholder_id (PK) — safe with or without unique on email
    const BATCH_SIZE = 250
    let inserted = 0
    const upsert_errors: string[] = []
    for (let i = 0; i < importable.length; i += BATCH_SIZE) {
      const batch = importable.slice(i, i + BATCH_SIZE).map((r) => r.row)
      const { error } = await supabaseAdmin
        .from('user_fed_lrsj')
        .upsert(batch, { onConflict: 'stakeholder_id', ignoreDuplicates: false })
      if (error) {
        upsert_errors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        inserted += batch.length
      }
    }

    return NextResponse.json({
      dry_run: false,
      csv_total: parsed.rows.length,
      only_approved: onlyApproved,
      filtered_out_by_status,
      skipped: { no_name, no_member_no, without_stakeholder },
      duplicates_collapsed,
      shared_emails,
      to_insert: importable.length,
      inserted,
      new_stakeholders_inserted,
      new_stakeholders_with_synthetic_email: new_stakeholder_inserts.filter((s) => s.email.endsWith('@import.lrsj.local')).length,
      backfill_member_no,
      names_updated,
      member_status_counts,
      plan_status_counts,
      academias_nao_encontradas,
      errors: upsert_errors,
      stakeholder_errors: new_stakeholder_errors,
    })
  } catch (error) {
    console.error('[import-lrsj] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
