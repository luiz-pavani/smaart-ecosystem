import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
const FROM_EMAIL = 'PROFEP MAX <judo@profepmax.com.br>'

serve(async (_req: Request) => {
  try {
    console.log('[Migration Test] Iniciando envio de teste...')
    console.log('[Migration Test] RESEND_API_KEY presente:', !!Deno.env.get('RESEND_API_KEY'))

    const testEmail = 'luizpavani@gmail.com'
    const userName = 'Luiz Pavani'

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
          
          <p style="color: #ccc; font-size: 16px; margin-bottom: 25px;">Este é um email de teste da campanha de migração.</p>

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

            <div style="text-align: center; margin-top: 25px; padding: 20px; background: #0A0A0A; border-radius: 12px;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 2px;">Cupom Exclusivo</p>
              <p style="margin: 0; font-size: 28px; font-weight: 900; color: #F59E0B; letter-spacing: 3px; font-family: 'Courier New', monospace;">PROFEP2026</p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #DC2626; font-weight: bold;">⏰ Válido até 31/01/2026</p>
            </div>
          </div>

          <!-- Link de Teste -->
          <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 35px; border-radius: 20px; margin: 30px 0; text-align: center;">
            <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 900; color: #fff; text-transform: uppercase;">🧪 LINK DE TESTE</h3>
            
            <a href="https://www.profepmax.com.br/checkout?plan=mensal&paymentMethod=2&coupon=PROFEP2026" 
               style="display: inline-block; margin-top: 15px; background-color: #F59E0B; color: #000; padding: 20px 50px; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3);">
              🚀 TESTE O CHECKOUT
            </a>
          </div>

          <div style="background: #10B98110; border: 2px solid #10B981; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #fff;">✅ Se recebeu este email, o sistema de envios está funcionando!</p>
          </div>

          <p style="margin: 30px 0 0 0; font-size: 16px; font-weight: bold; color: #fff;">ARIAGATŌ!</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #999;">Equipe PROFEP MAX</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #666; font-style: italic;">"Tradição com Inovação - Evoluindo o Ensino do Judô"</p>
        </div>
        
        <!-- Footer -->
        <footer style="background-color: #0A0A0A; padding: 30px; text-align: center; border-top: 2px solid #222;">
          <p style="margin: 0 0 10px 0; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 2px;">PROFEP MAX © 2026 - EMAIL DE TESTE</p>
          <p style="margin: 0; font-size: 10px; color: #444;">Todos os direitos reservados</p>
        </footer>
      </div>
    `

    console.log('[Migration Test] Tentando enviar para:', testEmail)

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: testEmail,
      subject,
      html
    })

    console.log('[Migration Test] Resposta Resend:', JSON.stringify(response))

    if (response.error) {
      console.error('[Migration Test] Erro:', response.error)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao enviar email',
          details: response.error
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    console.log('[Migration Test] Email enviado com sucesso! ID:', response.data?.id)

    return new Response(
      JSON.stringify({ 
        message: 'Email de teste enviado com sucesso',
        email: testEmail,
        id: response.data?.id
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: unknown) {
    console.error('[Migration Test] Erro geral:', error)
    
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
