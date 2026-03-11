import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
      // User already exists - update their info
      stakeholderId = existing.id
      await supabaseAdmin
        .from('stakeholders')
        .update({
          nome_completo,
          academia_id: academia_id || null,
          federacao_id: federacao_id || null,
          role: 'atleta',
        })
        .eq('id', stakeholderId)
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

    // 4. Insert sports-specific data into user_fed_lrsj
    const { data: registro, error: regError } = await supabaseAdmin
      .from('user_fed_lrsj')
      .insert({
        stakeholder_id: stakeholderId,
        academia_id: academia_id || null,
        nome_completo,
        email,
        cpf: cpf || null,
        graduacao: graduacao || null,
        data_nascimento: data_nascimento || null,
        celular: celular || null,
        status_membro: 'pendente',
        metadata: metadata || {},
      })
      .select('id')
      .single()

    if (regError) {
      console.error('Error inserting user_fed_lrsj:', regError)
      // Non-fatal: stakeholder was created, sports record failed
      return NextResponse.json({
        id: stakeholderId,
        warning: 'Registro criado mas dados esportivos não foram salvos',
      })
    }

    return NextResponse.json({ id: stakeholderId, registro_id: registro?.id })
  } catch (err: any) {
    console.error('Registration error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
