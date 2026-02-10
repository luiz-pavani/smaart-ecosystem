import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
const FROM_EMAIL = 'PROFEP MAX <judo@profepmax.com.br>'

interface Profile {
  id: string
  email: string
  full_name: string | null
  migration_campaign_sent_at?: string | null
}

interface EmailResult {
  success: boolean
  email: string
  error?: unknown
}

serve(async (_req: Request) => {
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

    console.log('[Migration Campaign] Iniciando envio da campanha de migração...')

    // Buscar TODOS os usuários com email válido
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, migration_campaign_sent_at')
      .not('email', 'is', null)
      .is('migration_campaign_sent_at', null)
      .order('created_at', { ascending: true })

    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`)
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('[Migration Campaign] Nenhum usuário encontrado')
      return new Response(JSON.stringify({ message: 'Nenhum usuário encontrado' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log(`[Migration Campaign] Enviando para ${allUsers.length} usuários pendentes (sequencial com delay)...`)

    // Função auxiliar para delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Enviar emails SEQUENCIALMENTE com delay para respeitar rate limits do Resend
    const results: EmailResult[] = []
    
    for (const user of (allUsers as Profile[])) {
      const userName = user.full_name || 'Sensei'
      
      const subject = '🥋 PROFEP MAX 2026 - Acesso Antecipado + 50% OFF Permanente (Só até 31/01)'
      
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #000; color: #fff; border-radius: 24px; overflow: hidden; border: 2px solid #333;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 60px 40px; text-align: center; position: relative;">
            <div style="font-size: 70px; margin-bottom: 15px;">🥋</div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">PROFEP MAX 2026<br/><span style="font-size: 20px; color: #FEF3C7;">NOVA PLATAFORMA</span></h1>
            <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: bold;">Acesso Antecipado Exclusivo</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 45px 40px; line-height: 1.8;">
            <p style="font-size: 20px; color: #fff; margin: 0 0 20px 0;"><strong>HAI, Sensei ${userName}!</strong></p>
            
            <p style="color: #ccc; font-size: 16px; margin-bottom: 25px;">Temos uma notícia especial para você que faz parte da nossa comunidade desde o início.</p>

            <!-- Nova Era Box -->
            <div style="background: linear-gradient(135deg, #DC262620 0%, #991B1B20 100%); padding: 30px; border-radius: 20px; border: 2px solid #DC2626; margin: 30px 0; text-align: center;">
              <h2 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 900; color: #DC2626; text-transform: uppercase; letter-spacing: 1px;">🚀 A Nova Era Chegou</h2>
              <p style="margin: 0; font-size: 15px; color: #ccc; line-height: 1.6;">Depois de meses de desenvolvimento, estamos prontos para lançar oficialmente a <strong style="color: #fff;">PROFEP MAX 2026</strong> - uma plataforma completamente redesenhada, mais moderna, rápida e completa.</p>
            </div>

            <!-- Oferta Exclusiva -->
            <div style="background: #1A1A1A; padding: 35px; border-radius: 20px; border: 2px solid #F59E0B; margin: 30px 0;">
              <h3 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 900; color: #F59E0B; text-align: center; text-transform: uppercase;">🎁 Sua Oferta Exclusiva</h3>
              
              <div style="background: #0A0A0A; padding: 25px; border-radius: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #333;">
                  <span style="font-size: 14px; color: #999; text-decoration: line-through;">Preço Regular</span>
                  <span style="font-size: 18px; color: #999; text-decoration: line-through;">R$ 59,90/mês</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 16px; color: #F59E0B; font-weight: bold;">Seu Preço Exclusivo</span>
                  <span style="font-size: 32px; color: #10B981; font-weight: 900;">R$ 29,95<span style="font-size: 16px;">/mês</span></span>
                </div>
              </div>

              <div style="background: #10B98110; border: 2px solid #10B981; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0; font-size: 18px; font-weight: 900; color: #10B981;">💰 ECONOMIA DE R$ 29,95/MÊS (50% OFF)</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #fff;">R$ 359,40 de economia anual!</p>
              </div>

              <div style="margin-top: 25px; padding: 20px; background: #DC262610; border-left: 4px solid #DC2626; border-radius: 8px;">
                <p style="margin: 0; font-size: 13px; color: #ccc; line-height: 1.6;">
                  ✅ <strong>Desconto PERMANENTE</strong> enquanto mantiver sua assinatura<br/>
                  ✅ <strong>Acesso Antecipado</strong> antes do lançamento público<br/>
                  ✅ <strong>Dados migrados automaticamente</strong><br/>
                  ✅ <strong>Suporte prioritário</strong> durante a transição
                </p>
              </div>

              <div style="text-align: center; margin-top: 25px; padding: 20px; background: #0A0A0A; border-radius: 12px;">
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 2px;">Cupom Exclusivo</p>
                <p style="margin: 0; font-size: 28px; font-weight: 900; color: #F59E0B; letter-spacing: 3px; font-family: 'Courier New', monospace;">PROFEP2026</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #DC2626; font-weight: bold;">⏰ Válido até 31/01/2026</p>
              </div>
            </div>

            <!-- Como Migrar -->
            <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 35px; border-radius: 20px; margin: 30px 0; text-align: center;">
              <h3 style="margin: 0 0 25px 0; font-size: 22px; font-weight: 900; color: #fff; text-transform: uppercase;">💡 Como Migrar? É Simples!</h3>
              
              <div style="text-align: left; max-width: 500px; margin: 0 auto;">
                <div style="margin-bottom: 15px; display: flex; align-items: flex-start; gap: 15px;">
                  <div style="background: #fff; color: #DC2626; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; flex-shrink: 0;">1</div>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #FEF3C7;">Clique no botão abaixo</p>
                </div>
                <div style="margin-bottom: 15px; display: flex; align-items: flex-start; gap: 15px;">
                  <div style="background: #fff; color: #DC2626; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; flex-shrink: 0;">2</div>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #FEF3C7;">Faça login com seu email atual</p>
                </div>
                <div style="margin-bottom: 15px; display: flex; align-items: flex-start; gap: 15px;">
                  <div style="background: #fff; color: #DC2626; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; flex-shrink: 0;">3</div>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #FEF3C7;">O cupom já estará aplicado automaticamente</p>
                </div>
                <div style="margin-bottom: 0; display: flex; align-items: flex-start; gap: 15px;">
                  <div style="background: #fff; color: #DC2626; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; flex-shrink: 0;">4</div>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #FEF3C7;">Confirme o pagamento de <strong>R$ 29,95/mês</strong></p>
                </div>
              </div>

              <a href="https://www.profepmax.com.br/checkout?plan=mensal&paymentMethod=2&coupon=PROFEP2026" 
                 style="display: inline-block; margin-top: 30px; background-color: #F59E0B; color: #000; padding: 20px 50px; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3);">
                🚀 MIGRAR AGORA
              </a>
            </div>

            <p style="margin: 30px 0 0 0; font-size: 16px; font-weight: bold; color: #fff;">ARIAGATŌ!</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #999;">Equipe PROFEP MAX</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666; font-style: italic;">"Tradição com Inovação - Evoluindo o Ensino do Judô"</p>

            <!-- PS -->
            <div style="margin-top: 30px; padding: 20px; background: #F59E0B10; border-left: 4px solid #F59E0B; border-radius: 8px;">
              <p style="margin: 0; font-size: 13px; color: #ccc; line-height: 1.6;">
                <strong style="color: #F59E0B;">P.S.:</strong> Esta oferta expira em <strong style="color: #fff;">31/01/2026 às 23h59</strong>. Garanta seu desconto permanente de 50% OFF (R$ 29,95/mês) antes que seja tarde!
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <footer style="background-color: #0A0A0A; padding: 30px; text-align: center; border-top: 2px solid #222;">
            <p style="margin: 0 0 10px 0; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 2px;">PROFEP MAX © 2026</p>
            <p style="margin: 0; font-size: 10px; color: #444;">Todos os direitos reservados</p>
          </footer>
        </div>
      `

      try {
        console.log(`[Migration Campaign] Enviando para ${user.email}...`)
        const response = await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject,
          html
        })
        
        if (response.error) {
          console.error(`[Migration Campaign] Erro Resend para ${user.email}:`, response.error)
          results.push({ success: false, email: user.email, error: response.error })
        } else {
          console.log(`[Migration Campaign] ✓ Email enviado para ${user.email} (ID: ${response.data?.id})`)
          results.push({ success: true, email: user.email })

          // Marca o perfil como já notificado para evitar reenvio
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ migration_campaign_sent_at: new Date().toISOString() })
            .eq('id', user.id)

          if (updateError) {
            console.error(`[Migration Campaign] Falha ao marcar envio para ${user.email}:`, updateError)
          }
        }
      } catch (emailError: unknown) {
        console.error(`[Migration Campaign] Exception ao enviar para ${user.email}:`, emailError)
        results.push({ success: false, email: user.email, error: emailError })
      }
      
      // Delay de 300ms entre emails para respeitar rate limit do Resend
      await delay(300)
    }

    const successCount = results.filter((r: EmailResult) => r.success).length
    const failCount = results.filter((r: EmailResult) => !r.success).length

    console.log(`[Migration Campaign] Finalizado: ${successCount} enviados, ${failCount} falhas`)

    if (failCount > 0) {
      console.log('[Migration Campaign] Emails falhados:')
      results
        .filter((r: EmailResult) => !r.success)
        .slice(0, 10)
        .forEach((r: EmailResult) => {
          console.log(`  - ${r.email}: ${JSON.stringify(r.error)}`)
        })
    }

    return new Response(
      JSON.stringify({ 
        message: 'Campanha de migração enviada',
        sent: successCount,
        failed: failCount,
        total: allUsers.length
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: unknown) {
    console.error('[Migration Campaign] Erro geral:', error)
    
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
