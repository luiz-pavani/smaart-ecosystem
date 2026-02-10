import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
const FROM_EMAIL = 'PROFEP MAX <judo@profepmax.com.br>'
const SITE_URL = 'https://www.profepmax.com.br'

interface LaunchLead {
  id: string
  email: string
  full_name: string | null
  tracking_id: string
}

interface EmailResult {
  success: boolean
  email: string
  tracking_id?: string
  error?: unknown
}

serve(async (req: Request) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('[Launch Campaign] Iniciando envio de campanha de lançamento...')

    // Buscar leads que ainda não receberam o email (com limite configurável)
    const url = new URL(req.url)
    const limitParam = url.searchParams.get('limit')
    const limit = Math.min(Math.max(parseInt(limitParam || '500', 10) || 500, 1), 500)

    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('launch_campaign_leads')
      .select('id, email, full_name, tracking_id')
      .is('email_sent_at', null)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (leadsError) {
      throw new Error(`Erro ao buscar leads: ${leadsError.message}`)
    }

    if (!leads || leads.length === 0) {
      console.log('[Launch Campaign] Nenhum lead encontrado para enviar')
      return new Response(JSON.stringify({ message: 'Nenhum lead encontrado' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log(`[Launch Campaign] Enviando para ${leads.length} leads pendentes (sequencial com delay)...`)

    // Função auxiliar para delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Enviar emails SEQUENCIALMENTE com delay
    const results: EmailResult[] = []
    
    for (const lead of (leads as LaunchLead[])) {
      const userName = lead.full_name?.split(' ')[0] || 'Sensei'
      
      // URL com tracking ID para monitoramento de cliques
      const trackingUrl = `${SITE_URL}/checkout?plan=mensal&paymentMethod=2&tracking_id=${lead.tracking_id}&utm_source=launch_campaign&utm_medium=email`
      
      const subject = '🥋 PROFEP MAX 2026 - 35% OFF por 48h (R$ 39,90/mês)'
      
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #000; color: #fff; border-radius: 24px; overflow: hidden; border: 2px solid #333;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 60px 40px; text-align: center; position: relative;">
            <div style="font-size: 70px; margin-bottom: 15px;">🥋</div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">PROFEP MAX 2026<br/><span style="font-size: 20px; color: #FEF3C7;">LANÇAMENTO OFICIAL</span></h1>
            <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: bold;">Desconto Exclusivo de Lançamento</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 45px 40px; line-height: 1.8;">
            <p style="font-size: 20px; color: #fff; margin: 0 0 20px 0;"><strong>HAI, Sensei ${userName}!</strong></p>
            
            <p style="color: #ccc; font-size: 16px; margin-bottom: 25px;">Estamos emocionados em convidá-lo para fazer parte da revolução do ensino do judô no Brasil.</p>

            <!-- Nova Era Box -->
            <div style="background: linear-gradient(135deg, #DC262620 0%, #991B1B20 100%); padding: 30px; border-radius: 20px; border: 2px solid #DC2626; margin: 30px 0; text-align: center;">
              <h2 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 900; color: #DC2626; text-transform: uppercase; letter-spacing: 1px;">🚀 Bem-vindo ao Futuro</h2>
              <p style="margin: 0; font-size: 15px; color: #ccc; line-height: 1.6;">Depois de meses de desenvolvimento, lançamos oficialmente a <strong style="color: #fff;">PROFEP MAX 2026</strong> - a plataforma mais moderna e completa para o ensino do judô.</p>
            </div>

            <!-- Oferta Exclusiva -->
            <div style="background: #1A1A1A; padding: 35px; border-radius: 20px; border: 2px solid #F59E0B; margin: 30px 0;">
              <h3 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 900; color: #F59E0B; text-align: center; text-transform: uppercase;">🎁 35% OFF por 48h</h3>
              
              <div style="background: #0A0A0A; padding: 25px; border-radius: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #333;">
                  <span style="font-size: 14px; color: #999; text-decoration: line-through;">Preço Regular</span>
                  <span style="font-size: 18px; color: #999; text-decoration: line-through;">R$ 61,38/mês</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 16px; color: #F59E0B; font-weight: bold;">Seu Preço Exclusivo</span>
                  <span style="font-size: 32px; color: #10B981; font-weight: 900;">R$ 39,90<span style="font-size: 16px;">/mês</span></span>
                </div>
              </div>

              <div style="background: #10B98110; border: 2px solid #10B981; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0; font-size: 18px; font-weight: 900; color: #10B981;">💰 ECONOMIA DE R$ 21,48/MÊS</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #fff;">R$ 257,76 de economia anual!</p>
              </div>

              <div style="margin-top: 25px; padding: 20px; background: #DC262610; border-left: 4px solid #DC2626; border-radius: 8px;">
                <p style="margin: 0; font-size: 13px; color: #ccc; line-height: 1.6;">
                  ✅ <strong>Desconto PERMANENTE</strong> enquanto mantiver sua assinatura<br/>
                  ✅ <strong>Acesso Completo</strong> a toda plataforma desde o dia 1<br/>
                  ✅ <strong>Comunidade Global</strong> de mestres e alunos<br/>
                  ✅ <strong>Suporte Prioritário</strong> 24/7
                </p>
              </div>

              <div style="text-align: center; margin-top: 25px; padding: 20px; background: #0A0A0A; border-radius: 12px;">
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 2px;">Desconto Automático Aplicado</p>
                <p style="margin: 0; font-size: 28px; font-weight: 900; color: #F59E0B; letter-spacing: 3px; font-family: 'Courier New', monospace;">-35%</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #10B981; font-weight: bold;">⏰ Apenas 48 horas</p>
              </div>
            </div>

            <!-- Por que escolher PROFEP MAX -->
            <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 35px; border-radius: 20px; margin: 30px 0; text-align: center;">
              <h3 style="margin: 0 0 25px 0; font-size: 22px; font-weight: 900; color: #fff; text-transform: uppercase;">💡 Por que escolher PROFEP MAX?</h3>
              
              <div style="text-align: left; max-width: 500px; margin: 0 auto;">
                <div style="margin-bottom: 15px; display: flex; align-items: flex-start; gap: 15px;">
                  <div style="background: #fff; color: #DC2626; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; flex-shrink: 0;">✓</div>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #FEF3C7;">Professores da <strong>Kodokan</strong>, <strong>Medalhistas Olímpicos</strong>, <strong>Doutores</strong> e <strong>Kodanshas</strong></p>
                </div>
                <div style="margin-bottom: 15px; display: flex; align-items: flex-start; gap: 15px;">
                  <div style="background: #fff; color: #DC2626; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; flex-shrink: 0;">✓</div>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #FEF3C7;">Conteúdo atualizado constantemente</p>
                </div>
                <div style="margin-bottom: 15px; display: flex; align-items: flex-start; gap: 15px;">
                  <div style="background: #fff; color: #DC2626; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; flex-shrink: 0;">✓</div>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #FEF3C7;">Certificados reconhecidos internacionalmente</p>
                </div>
                <div style="margin-bottom: 0; display: flex; align-items: flex-start; gap: 15px;">
                  <div style="background: #fff; color: #DC2626; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; flex-shrink: 0;">✓</div>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #FEF3C7;">Acesso vitalício aos seus cursos</p>
                </div>
              </div>

              <a href="${trackingUrl}" 
                 style="display: inline-block; margin-top: 30px; background-color: #F59E0B; color: #000; padding: 20px 50px; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3);">
                🚀 COMECE AGORA - R$ 39,90/MÊS
              </a>
            </div>

            <p style="margin: 30px 0 0 0; font-size: 16px; font-weight: bold; color: #fff;">ARIAGATŌ!</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #999;">Equipe PROFEP MAX</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666; font-style: italic;">"Tradição com Inovação - Evoluindo o Ensino do Judô"</p>

            <!-- PS -->
            <div style="margin-top: 30px; padding: 20px; background: #F59E0B10; border-left: 4px solid #F59E0B; border-radius: 8px;">
              <p style="margin: 0; font-size: 13px; color: #ccc; line-height: 1.6;">
                <strong style="color: #F59E0B;">P.S.:</strong> Oferta relâmpago: <strong style="color: #fff;">35% OFF por 48 horas</strong> e <strong style="color: #fff;">limitada aos primeiros 30 clientes</strong>. Após isso, o valor volta ao normal.
              </p>
            </div>
          </div>
          
          <!-- Footer + Tracking Pixel -->
          <footer style="background-color: #0A0A0A; padding: 30px; text-align: center; border-top: 2px solid #222;">
            <p style="margin: 0 0 10px 0; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 2px;">PROFEP MAX © 2026</p>
            <p style="margin: 0; font-size: 10px; color: #444;">Todos os direitos reservados</p>
            
            <!-- Tracking Pixel (não visível) -->
            <img src="${SITE_URL}/api/tracking/open?id=${lead.tracking_id}" width="1" height="1" style="display:none;" alt="" />
          </footer>
        </div>
      `

      try {
        console.log(`[Launch Campaign] Enviando para ${lead.email}...`)
        const response = await resend.emails.send({
          from: FROM_EMAIL,
          to: lead.email,
          subject,
          html
        })
        
        if (response.error) {
          console.error(`[Launch Campaign] Erro Resend para ${lead.email}:`, response.error)
          results.push({ success: false, email: lead.email, tracking_id: lead.tracking_id, error: response.error })
        } else {
          console.log(`[Launch Campaign] ✓ Email enviado para ${lead.email} (ID: ${response.data?.id})`)
          results.push({ success: true, email: lead.email, tracking_id: lead.tracking_id })

          // Marca como enviado
          const { error: updateError } = await supabaseAdmin
            .from('launch_campaign_leads')
            .update({ 
              email_sent_at: new Date().toISOString(),
              status: 'sent'
            })
            .eq('id', lead.id)

          if (updateError) {
            console.error(`[Launch Campaign] Falha ao marcar envio para ${lead.email}:`, updateError)
          }
        }
      } catch (emailError: unknown) {
        console.error(`[Launch Campaign] Exception ao enviar para ${lead.email}:`, emailError)
        results.push({ success: false, email: lead.email, tracking_id: lead.tracking_id, error: emailError })
      }
      
      // Delay de 300ms entre emails
      await delay(300)
    }

    const successCount = results.filter((r: EmailResult) => r.success).length
    const failCount = results.filter((r: EmailResult) => !r.success).length

    console.log(`[Launch Campaign] Finalizado: ${successCount} enviados, ${failCount} falhas`)

    if (failCount > 0) {
      console.log('[Launch Campaign] Emails falhados:')
      results
        .filter((r: EmailResult) => !r.success)
        .slice(0, 10)
        .forEach((r: EmailResult) => {
          console.log(`  - ${r.email}: ${JSON.stringify(r.error)}`)
        })
    }

    return new Response(
      JSON.stringify({ 
        message: 'Campanha de lançamento enviada',
        sent: successCount,
        failed: failCount,
        total: leads.length
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: unknown) {
    console.error('[Launch Campaign] Erro geral:', error)
    
    let errorMessage = 'Erro desconhecido'
    
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>
      if ('message' in errorObj && typeof errorObj.message === 'string') {
        errorMessage = errorObj.message
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
