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

    // Dedup by lower(email): keep row with latest Expire date
    const by_email = new Map<string, ParsedRow>()
    let no_name = 0
    let no_email = 0
    for (const r of filteredRows) {
      const data = r.data as CsvRowData
      const nome = (data['Name'] || '').trim()
      if (!nome) {
        no_name++
        continue
      }
      const email = (data['Email'] || '').trim().toLowerCase()
      if (!email) {
        no_email++
        continue
      }
      const prev = by_email.get(email)
      if (!prev) {
        by_email.set(email, r)
      } else {
        const prevExp = parseDateForCompare((prev.data as CsvRowData)['Expire date'])
        const curExp = parseDateForCompare(data['Expire date'])
        if (curExp >= prevExp) by_email.set(email, r)
      }
    }
    const deduped_rows = Array.from(by_email.values())
    const duplicates_collapsed = filteredRows.length - no_name - no_email - deduped_rows.length

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

    // Resolve existing stakeholders by email (case-insensitive in client code via lower)
    const emails = deduped_rows.map((r) => (r.data as CsvRowData)['Email'].trim().toLowerCase())
    const stakeholder_map = new Map<string, string>()
    // Batch in groups of 100 to avoid PostgREST URL limits
    for (let i = 0; i < emails.length; i += 100) {
      const slice = emails.slice(i, i + 100)
      const { data: sh } = await supabaseAdmin
        .from('stakeholders')
        .select('id, email')
        .in('email', slice)
      for (const s of sh ?? []) {
        if (s.email) stakeholder_map.set(s.email.toLowerCase(), s.id)
      }
    }

    // For emails without a stakeholder, plan to create one
    const new_stakeholder_inserts: Array<{
      id: string
      email: string
      nome_completo: string
      nome_usuario: string
      role: string
      funcao: string
    }> = []
    for (const r of deduped_rows) {
      const data = r.data as CsvRowData
      const email = data['Email'].trim().toLowerCase()
      if (stakeholder_map.has(email)) continue
      const id = crypto.randomUUID()
      // stakeholders.nome_usuario is NOT NULL with a unique index; derive from
      // email local-part + a short suffix from the UUID to avoid collisions.
      const localPart = email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '_').slice(0, 40)
      const nome_usuario = `${localPart}_${id.replace(/-/g, '').slice(0, 6)}`
      stakeholder_map.set(email, id)
      new_stakeholder_inserts.push({
        id,
        email,
        nome_completo: (data['Name'] || '').trim(),
        nome_usuario,
        role: 'atleta',
        funcao: 'ATLETA',
      })
    }

    // Transform every (deduped) row
    const results: ReturnType<typeof transformSmooothcompRow>[] = []
    for (const parsedRow of deduped_rows) {
      const data = parsedRow.data as CsvRowData
      const email = data['Email'].trim().toLowerCase()
      const stakeholder_id = stakeholder_map.get(email) ?? null
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
        skipped: { no_name, no_email, without_stakeholder },
        duplicates_collapsed,
        to_insert: importable.length,
        new_stakeholders: new_stakeholder_inserts.length,
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
    for (const s of new_stakeholder_inserts) {
      try {
        const { error } = await supabaseAdmin.auth.admin.createUser({
          email: s.email,
          email_confirm: true,
          user_metadata: {
            full_name: s.nome_completo,
            username: s.nome_usuario,
            stakeholder_role: s.role,
          },
        })
        if (error) {
          new_stakeholder_errors.push(`${s.email}: ${error.message}`)
          continue
        }
        new_stakeholders_inserted++
      } catch (e) {
        new_stakeholder_errors.push(`${s.email}: ${e instanceof Error ? e.message : 'erro'}`)
      }
    }
    // Refresh stakeholder_map with the real IDs assigned by Supabase Auth
    if (new_stakeholders_inserted > 0) {
      const emails = new_stakeholder_inserts.map((s) => s.email)
      for (let i = 0; i < emails.length; i += 100) {
        const slice = emails.slice(i, i + 100)
        const { data: sh } = await supabaseAdmin
          .from('stakeholders')
          .select('id, email')
          .in('email', slice)
        for (const row of sh ?? []) {
          if (row.email) stakeholder_map.set(row.email.toLowerCase(), row.id)
        }
      }
      // Re-set stakeholder_id on results that referenced the temporary IDs
      for (const r of results) {
        if (r.row.email) {
          const newId = stakeholder_map.get(r.row.email.toLowerCase())
          if (newId) r.row.stakeholder_id = newId
        }
      }
    }

    // Upsert user_fed_lrsj via stakeholder_id (PK) — safe with or without unique on email
    const BATCH_SIZE = 50
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
      skipped: { no_name, no_email, without_stakeholder },
      duplicates_collapsed,
      to_insert: importable.length,
      inserted,
      new_stakeholders_inserted,
      member_status_counts,
      plan_status_counts,
      academias_nao_encontradas,
      errors: upsert_errors,
    })
  } catch (error) {
    console.error('[import-lrsj] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
