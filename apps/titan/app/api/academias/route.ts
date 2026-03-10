import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const normalizeSigla = (value: unknown) => {
  if (typeof value !== 'string') return value
  const cleaned = value.trim().toUpperCase()
  if (cleaned.length > 3) {
    throw new Error('Sigla deve ter no máximo 3 caracteres.')
  }
  return cleaned
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      return NextResponse.json(
        { error: 'Supabase credentials missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(url, key)
    const body = await request.json()

    if (!body.stakeholder_id) {
      const candidateEmail = String(body.responsavel_email || '').trim().toLowerCase()

      if (candidateEmail) {
        const { data: stakeholders } = await supabase
          .from('stakeholders')
          .select('id')
          .eq('email', candidateEmail)
          .limit(1)

        if (stakeholders && stakeholders.length > 0) {
          body.stakeholder_id = stakeholders[0].id
        }
      }
    }

    if (!body.federacao_id && body.stakeholder_id) {
      const { data: federacoes } = await supabase
        .from('federacoes')
        .select('id, created_at')
        .eq('stakeholder_id', body.stakeholder_id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (federacoes && federacoes.length > 0) {
        body.federacao_id = federacoes[0].id
      }
    }

    if (!body.federacao_id) {
      return NextResponse.json(
        { error: 'Federação não identificada para este cadastro.' },
        { status: 400 }
      )
    }

    body.sigla = normalizeSigla(body.sigla)

    // Convert empty date strings to null for optional date fields
    if (body.anualidade_vencimento === '' || body.anualidade_vencimento === null) {
      body.anualidade_vencimento = null
    }

    console.log(`📝 Creating new academia:`, body.nome)

    const { data, error } = await supabase
      .from('academias')
      .insert([body])
      .select()

    if (error) {
      console.error('❌ Create error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log(`✅ Academia created successfully`)
    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
