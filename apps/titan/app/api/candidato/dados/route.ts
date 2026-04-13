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
    const { data: stakeholderData } = await supabaseAdmin
      .from('stakeholders')
      .select('id, nome_completo, data_nascimento, kyu_dan_id, email, telefone, candidato')
      .eq('id', user.id)
      .maybeSingle()

    if (!stakeholderData) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 })
    }

    // cpf/cidade/estado podem não existir como colunas — buscar separadamente com fallback
    let extraFields: { cpf?: string | null; cidade?: string | null; estado?: string | null } = {}
    try {
      const { data: extra } = await supabaseAdmin
        .from('stakeholders')
        .select('cpf, cidade, estado')
        .eq('id', user.id)
        .maybeSingle()
      if (extra) extraFields = extra
    } catch { /* colunas não existem ainda */ }

    // Fetch kyu_dan info for current graduation
    let kyuDanInfo = null
    if (stakeholderData.kyu_dan_id) {
      const { data: kd } = await supabaseAdmin
        .from('kyu_dan')
        .select('id, kyu_dan, cor_faixa')
        .eq('id', stakeholderData.kyu_dan_id)
        .single()
      kyuDanInfo = kd
    }

    // Fetch user_fed_lrsj — prefer stakeholder_id match, fallback to email
    const { data: lrsjById } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select('kyu_dan_id, data_ultima_graduacao, nome_completo, data_nascimento, telefone, email')
      .eq('stakeholder_id', user.id)
      .maybeSingle()

    const { data: lrsjByEmail } = !lrsjById ? await supabaseAdmin
      .from('user_fed_lrsj')
      .select('kyu_dan_id, data_ultima_graduacao, nome_completo, data_nascimento, telefone, email')
      .eq('email', user.email!)
      .maybeSingle() : { data: null }

    const lrsjData = lrsjById || lrsjByEmail

    // Resolve kyu_dan_id: stakeholder > lrsj
    let finalKyuDanId = stakeholderData.kyu_dan_id || lrsjData?.kyu_dan_id
    if (!kyuDanInfo && finalKyuDanId) {
      const { data: kd } = await supabaseAdmin
        .from('kyu_dan')
        .select('id, kyu_dan, cor_faixa')
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

    // Fetch pagamento mais recente do candidato (tipo profep)
    let pagamento = null
    if (inscricao?.id) {
      const { data: pg } = await supabaseAdmin
        .from('pagamentos')
        .select('id, tipo, valor, status, pix_qr_code, pix_qr_code_url, pix_expiracao, safe2pay_id')
        .eq('stakeholder_id', user.id)
        .eq('referencia_tipo', 'profep')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      pagamento = pg ?? null
    }

    // Fetch candidato_documentos
    const { data: documentos } = await supabaseAdmin
      .from('candidato_documentos')
      .select('*')
      .eq('stakeholder_id', user.id)
      .order('created_at', { ascending: false })

    // Fetch kyu_dan list
    const { data: kyuDanList } = await supabaseAdmin
      .from('kyu_dan')
      .select('id, kyu_dan, cor_faixa')
      .order('id', { ascending: true })

    // Try to fetch federation schedule (may not exist)
    let federationSchedule: unknown[] = []
    try {
      const { data: scheduleData } = await supabaseAdmin
        .from('federation_schedule')
        .select('*')
        .order('date', { ascending: true })
      // Normalize field names to match UI expectations
      federationSchedule = (scheduleData || []).map((ev: any) => ({
        id: ev.id,
        titulo: ev.title || ev.titulo || ev.name || 'Evento',
        descricao: ev.description || ev.descricao || null,
        data: ev.date || ev.data,
        hora: ev.start_time || ev.hora || null,
        local: ev.location || ev.local || null,
        tipo: ev.type || ev.tipo || null,
        graduation_level: ev.graduation_level || [],
        link: ev.link || null,
        modality: ev.modality || null,
      }))
    } catch {
      federationSchedule = []
    }

    return NextResponse.json({
      stakeholder: {
        ...stakeholderData,
        ...extraFields,
        nome_completo: stakeholderData.nome_completo || lrsjData?.nome_completo || null,
        data_nascimento: stakeholderData.data_nascimento || lrsjData?.data_nascimento || null,
        telefone: stakeholderData.telefone || lrsjData?.telefone || null,
        email: stakeholderData.email || lrsjData?.email || null,
        kyu_dan: kyuDanInfo,
        data_ultima_graduacao: lrsjData?.data_ultima_graduacao || null,
      },
      inscricao: inscricao || null,
      pagamento: pagamento || null,
      documentos: documentos || [],
      federation_schedule: federationSchedule,
      kyu_dan_list: kyuDanList || [],
    })
  } catch (err) {
    console.error('Error in candidato/dados:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
