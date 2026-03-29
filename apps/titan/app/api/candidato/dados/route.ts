import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch stakeholder data
    const { data: stakeholderData, error: stakeholderError } = await supabaseAdmin
      .from('stakeholders')
      .select('id, nome_completo, data_nascimento, kyu_dan_id, email, telefone, candidato')
      .eq('id', user.id)
      .single()

    if (stakeholderError) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 })
    }

    // Fetch kyu_dan info for current graduation
    let kyuDanInfo = null
    if (stakeholderData.kyu_dan_id) {
      const { data: kd } = await supabaseAdmin
        .from('kyu_dan')
        .select('id, graduacao, cor_faixa')
        .eq('id', stakeholderData.kyu_dan_id)
        .single()
      kyuDanInfo = kd
    }

    // Fetch user_fed_lrsj for additional data
    const { data: lrsjData } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select('kyu_dan_id, data_ultima_graduacao')
      .eq('email', user.email)
      .maybeSingle()

    // If lrsj has kyu_dan_id and stakeholder doesn't, use lrsj's
    let finalKyuDanId = stakeholderData.kyu_dan_id || lrsjData?.kyu_dan_id
    if (!kyuDanInfo && finalKyuDanId) {
      const { data: kd } = await supabaseAdmin
        .from('kyu_dan')
        .select('id, graduacao, cor_faixa')
        .eq('id', finalKyuDanId)
        .single()
      kyuDanInfo = kd
    }

    // Fetch candidato_inscricoes
    const { data: inscricao } = await supabaseAdmin
      .from('candidato_inscricoes')
      .select('*')
      .eq('stakeholder_id', user.id)
      .maybeSingle()

    // Fetch candidato_documentos
    const { data: documentos } = await supabaseAdmin
      .from('candidato_documentos')
      .select('*')
      .eq('stakeholder_id', user.id)
      .order('created_at', { ascending: false })

    // Fetch kyu_dan list
    const { data: kyuDanList } = await supabaseAdmin
      .from('kyu_dan')
      .select('id, graduacao, cor_faixa')
      .order('id', { ascending: true })

    // Try to fetch federation schedule (may not exist)
    let federationSchedule: unknown[] = []
    try {
      const { data: scheduleData } = await supabaseAdmin
        .from('federation_schedule')
        .select('*')
        .order('data', { ascending: true })
      federationSchedule = scheduleData || []
    } catch {
      federationSchedule = []
    }

    return NextResponse.json({
      stakeholder: {
        ...stakeholderData,
        kyu_dan: kyuDanInfo,
        data_ultima_graduacao: lrsjData?.data_ultima_graduacao || null,
      },
      inscricao: inscricao || null,
      documentos: documentos || [],
      federation_schedule: federationSchedule,
      kyu_dan_list: kyuDanList || [],
    })
  } catch (err) {
    console.error('Error in candidato/dados:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
