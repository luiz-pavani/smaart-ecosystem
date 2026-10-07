import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { LRSJ_FED_UUID, preencherStakeholderVazio, upsertFiliacoesLrsj } from '@/lib/filiacao/lrsj'

// Uses service role to create auth users and insert records
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      academia_id,
      federacao_id,
      nome_completo,
      email,
      cpf,
      graduacao,
      data_nascimento,
      celular,
      metadata,
    } = body

    if (!email || !nome_completo) {
      return NextResponse.json({ error: 'Email e nome são obrigatórios' }, { status: 400 })
    }

    // 1. Check if user already exists in stakeholders
    const { data: existing } = await supabaseAdmin
      .from('stakeholders')
      .select('id')
      .eq('email', email)
      .single()

    let stakeholderId: string

    if (existing) {
      // Já existe — endpoint público: não altera role/nome de uma conta existente,
      // só preenche vínculos vazios (passo 4).
      stakeholderId = existing.id
    } else {
      // 2. Create auth user (sends magic link / invite)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: {
          nome_completo,
          registro_via: 'self_service',
        },
      })

      if (authError) {
        // If user already exists in auth but not in stakeholders, try to get their id
        if (authError.message?.includes('already been registered')) {
          const { data: users } = await supabaseAdmin.auth.admin.listUsers()
          const found = users?.users?.find((u) => u.email === email)
          if (found) {
            stakeholderId = found.id
          } else {
            return NextResponse.json({ error: authError.message }, { status: 400 })
          }
        } else {
          return NextResponse.json({ error: authError.message }, { status: 400 })
        }
      } else {
        stakeholderId = authUser.user.id
      }

      // 3. Upsert stakeholder record
      await supabaseAdmin.from('stakeholders').upsert({
        id: stakeholderId,
        nome_completo,
        email,
        academia_id: academia_id || null,
        federacao_id: federacao_id || null,
        role: 'atleta',
        funcao: 'ATLETA',
      })
    }

    // 4. Filiação LRSJ pendente + dados pessoais vazios do stakeholder.
    // user_fed_lrsj é VIEW sem INSERT — grava direto em stakeholder_filiacoes / stakeholders.
    let kyuDanId: number | null = null
    if (graduacao) {
      const { data: kd } = await supabaseAdmin.rpc('resolve_kyu_dan_id', {
        graduacao_text: graduacao,
        dan_numeric: null,
        dan_nivel_text: null,
      })
      if (kd) kyuDanId = Number(kd)
    }

    const { error: stError } = await preencherStakeholderVazio(supabaseAdmin, stakeholderId, {
      academia_id: academia_id || null,
      federacao_id: federacao_id || null,
      cpf: cpf || null,
      data_nascimento: data_nascimento || null,
      telefone: celular || null,
      kyu_dan_id: kyuDanId,
    })
    if (stError) console.error('Error filling stakeholder:', stError)

    // Não rebaixa uma filiação já existente (ex.: atleta ativo se registrando de novo pelo link).
    const { data: filiacaoAtual } = await supabaseAdmin
      .from('stakeholder_filiacoes')
      .select('id')
      .eq('stakeholder_id', stakeholderId)
      .eq('federacao_id', LRSJ_FED_UUID)
      .maybeSingle()

    if (!filiacaoAtual) {
      const { error: regError } = await upsertFiliacoesLrsj(supabaseAdmin, [{
        stakeholder_id: stakeholderId,
        academia_id: academia_id || null,
        kyu_dan_id: kyuDanId,
        status_membro: 'pendente',
        observacoes: metadata?.registro_via ? `Registro via ${metadata.registro_via} (${metadata.fonte ?? 'academia'})` : null,
      }])

      if (regError) {
        console.error('Error inserting stakeholder_filiacoes:', regError)
        // Non-fatal: stakeholder was created, sports record failed
        return NextResponse.json({
          id: stakeholderId,
          warning: 'Registro criado mas dados esportivos não foram salvos',
        })
      }
    }

    return NextResponse.json({ id: stakeholderId })
  } catch (err: any) {
    console.error('Registration error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
