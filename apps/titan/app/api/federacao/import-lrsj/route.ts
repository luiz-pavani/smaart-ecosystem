import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parseCSV } from '@/lib/utils/csv-parser'
import {
  transformSmooothcompRow,
  type SmooothcompRow,
  type AcademiaRow,
} from '@/lib/import/smoothcomp'

const LRSJ_FED_ID_INT = 1
const LRSJ_FED_UUID = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin/master
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('role, master_access')
      .eq('id', user.id)
      .single()

    const isAuthorized =
      stakeholder?.master_access === true ||
      stakeholder?.role === 'admin' ||
      stakeholder?.role === 'master'

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Acesso restrito a administradores' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('csv_file') as File | null
    const dryRun = formData.get('dry_run') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'Arquivo CSV não enviado' }, { status: 400 })
    }

    const csvText = await file.text()

    // Parsear CSV
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

    // Carregar academias da LRSJ
    const { data: academiasData } = await supabase
      .from('academias')
      .select('id, nome')
      .eq('federacao_id', LRSJ_FED_UUID)
      .limit(500)

    const academia_map = new Map<string, AcademiaRow>(
      (academiasData ?? []).map((a) => [a.nome.toLowerCase(), a as AcademiaRow])
    )

    // Resolver stakeholders por email em batch
    const emails = parsed.rows
      .map((r) => (r.data['Email'] || '').trim().toLowerCase())
      .filter(Boolean)

    const { data: stakeholdersData } = await supabase
      .from('stakeholders')
      .select('id, email')
      .in('email', emails)

    const stakeholder_map = new Map<string, string>(
      (stakeholdersData ?? []).map((s) => [s.email.toLowerCase(), s.id])
    )

    // Transformar cada linha
    const results: ReturnType<typeof transformSmooothcompRow>[] = []
    const skipped: number[] = []

    for (const parsedRow of parsed.rows) {
      const nome = (parsedRow.data['Name'] || '').trim()
      if (!nome) {
        skipped.push(parsedRow.row)
        continue
      }

      const email = (parsedRow.data['Email'] || '').trim().toLowerCase()
      const stakeholder_id = stakeholder_map.get(email) ?? null

      const result = transformSmooothcompRow(
        parsedRow.data as unknown as SmooothcompRow,
        academia_map,
        LRSJ_FED_ID_INT,
        stakeholder_id
      )

      results.push(result)
    }

    // Modo dry-run: retornar preview
    if (dryRun) {
      const preview = results.slice(0, 50).map((r) => ({
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

      const total_warnings = results.reduce((acc, r) => acc + r.warnings.length, 0)
      const academias_nao_encontradas = [
        ...new Set(
          results
            .flatMap((r) => r.warnings)
            .filter((w) => w.includes('Academia não encontrada'))
            .map((w) => w.match(/"([^"]+)"/)?.[1] ?? w)
        ),
      ]

      return NextResponse.json({
        dry_run: true,
        total: results.length,
        skipped: skipped.length,
        total_warnings,
        academias_nao_encontradas,
        preview,
      })
    }

    // Upsert em lotes de 50
    const BATCH_SIZE = 50
    let inserted = 0
    const upsert_errors: string[] = []

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE).map((r) => r.row)

      const { error } = await supabase
        .from('user_fed_lrsj')
        .upsert(batch, { onConflict: 'email', ignoreDuplicates: false })

      if (error) {
        upsert_errors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        inserted += batch.length
      }
    }

    return NextResponse.json({
      dry_run: false,
      total: results.length,
      inserted,
      skipped: skipped.length,
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
