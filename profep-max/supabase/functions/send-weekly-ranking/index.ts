import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
const FROM_EMAIL = 'PROFEP MAX <judo@profepmax.com.br>'

interface Profile {
  id: string
  email: string
  full_name: string | null
  nome_completo: string | null
  pontos: number | null
}

interface EmailResult {
  success: boolean
  email: string
  error?: unknown
}

interface Top5User {
  name: string
  points: number
  position: number
}

serve(async (_req: Request) => {
  try {
    // Criar cliente Supabase com service_role para acesso total
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

    console.log('[Weekly Ranking] Iniciando envio do ranking semanal...')

    // 1. Buscar todos os usuários ativos com seus pontos
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, nome_completo, pontos')
      .eq('plano', 'ATIVO')
      .order('pontos', { ascending: false })

    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`)
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('[Weekly Ranking] Nenhum usuário ativo encontrado')
      return new Response(JSON.stringify({ message: 'Nenhum usuário ativo' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 2. Preparar Top 5
    const top5: Top5User[] = (allUsers as Profile[]).slice(0, 5).map((user, index) => ({
      name: user.full_name || user.nome_completo || 'Sensei',
      points: user.pontos || 0,
      position: index + 1
    }))

    console.log('[Weekly Ranking] Top 5:', top5)

    // 3. Enviar email para cada usuário
    const emailPromises = (allUsers as Profile[]).map(async (user) => {
      const userName = user.full_name || user.nome_completo || 'Sensei'
      const userPoints = user.pontos || 0
      
      // Encontrar posição do usuário
      const userPosition = (allUsers as Profile[]).findIndex(u => u.id === user.id) + 1

      // Medalhas para o pódio
      const getMedal = (position: number): string => {
        if (position === 1) return '🥇'
        if (position === 2) return '🥈'
        if (position === 3) return '🥉'
        return `${position}º`
      }

      const subject = '🏆 Ranking Semanal PROFEP MAX - Top 5 Senseis'
      
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #333;">
          <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 50px 30px; text-align: center;">
            <div style="font-size: 60px; margin-bottom: 10px;">🏆</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Ranking Semanal</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Top 5 Senseis da Semana</p>
          </div>
          
          <div style="padding: 40px 30px; line-height: 1.8;">
            <p style="font-size: 18px; color: #fff;">OSS, <strong>Sensei ${userName}</strong>!</p>
            
            <p style="color: #ccc;">Confira os 5 senseis mais dedicados desta semana no PROFEP MAX:</p>
            
            <div style="background: #1A1A1A; padding: 25px; border-radius: 16px; border: 1px solid #333; margin: 30px 0;">
              <h3 style="margin: 0 0 20px 0; color: #F59E0B; font-size: 16px; text-align: center; text-transform: uppercase; letter-spacing: 2px;">🏅 Pódio de Honra 🏅</h3>
              
              ${top5.map((topUser, index) => `
                <div style="background: ${index === 0 ? 'linear-gradient(135deg, #F59E0B20 0%, #D9770620 100%)' : '#0A0A0A'}; 
                            padding: 15px 20px; 
                            border-radius: 12px; 
                            margin-bottom: 12px; 
                            border: 1px solid ${index === 0 ? '#F59E0B50' : '#222'}; 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center;">
                  <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-size: 24px; font-weight: 900;">${getMedal(topUser.position)}</span>
                    <span style="font-size: 14px; font-weight: bold; color: ${index === 0 ? '#F59E0B' : '#fff'};">${topUser.name}</span>
                  </div>
                  <span style="font-size: 18px; font-weight: 900; color: ${index === 0 ? '#F59E0B' : '#10B981'};">${topUser.points} pts</span>
                </div>
              `).join('')}
            </div>

            ${userPosition <= 5 ? `
              <div style="background: linear-gradient(135deg, #10B98120 0%, #05966920 100%); padding: 20px; border-radius: 12px; border: 1px solid #10B98150; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 20px; font-weight: 900; color: #10B981;">🎉 PARABÉNS! 🎉</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #fff;">Você está entre os 5 melhores desta semana!</p>
                <p style="margin: 5px 0 0 0; font-size: 16px; color: #10B981; font-weight: bold;">Sua posição: ${getMedal(userPosition)} | ${userPoints} pontos</p>
              </div>
            ` : `
              <div style="background: #1A1A1A; padding: 20px; border-radius: 12px; border: 1px solid #333; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #ccc;">Sua posição atual no ranking:</p>
                <p style="margin: 10px 0 0 0; font-size: 24px; color: #F59E0B; font-weight: 900;">${userPosition}º lugar - ${userPoints} pontos</p>
              </div>
            `}

            <div style="background: #DC262610; padding: 25px; border-radius: 12px; border-left: 4px solid #DC2626; margin: 30px 0;">
              <h3 style="margin: 0 0 15px 0; color: #DC2626; font-size: 16px;">💪 Como Subir no Ranking:</h3>
              <p style="margin: 8px 0; color: #ccc; font-size: 14px;">🎓 Complete mais aulas e cursos</p>
              <p style="margin: 8px 0; color: #ccc; font-size: 14px;">📝 Faça avaliações e exames</p>
              <p style="margin: 8px 0; color: #ccc; font-size: 14px;">🏅 Conquiste novos troféus</p>
              <p style="margin: 8px 0; color: #ccc; font-size: 14px;">⚡ Acesse a plataforma diariamente</p>
            </div>

            <p style="color: #ccc; font-size: 14px; text-align: center; font-style: italic;">
              "O sucesso não é final, o fracasso não é fatal: é a coragem de continuar que conta."
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="https://www.profepmax.com.br/ranking" 
                 style="background-color: #F59E0B; color: #000; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block; margin-right: 10px;">
                VER RANKING COMPLETO
              </a>
              <a href="https://www.profepmax.com.br/cursos" 
                 style="background-color: #DC2626; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block;">
                FAZER UMA AULA
              </a>
            </div>
          </div>
          
          <footer style="background-color: #0A0A0A; padding: 25px; text-align: center; border-top: 1px solid #222;">
            <p style="margin: 0; font-size: 10px; color: #444;">PROFEP MAX © 2026</p>
          </footer>
        </div>
      `

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject,
          html
        })
        console.log(`[Weekly Ranking] Email enviado para ${user.email}`)
        return { success: true, email: user.email }
      } catch (emailError: unknown) {
        console.error(`[Weekly Ranking] Erro ao enviar para ${user.email}:`, emailError)
        return { success: false, email: user.email, error: emailError }
      }
    })

    // 4. Aguardar todos os envios
    const results: EmailResult[] = await Promise.all(emailPromises)
    const successCount = results.filter((r: EmailResult) => r.success).length
    const failCount = results.filter((r: EmailResult) => !r.success).length

    console.log(`[Weekly Ranking] Finalizado: ${successCount} enviados, ${failCount} falhas`)

    return new Response(
      JSON.stringify({ 
        message: 'Ranking semanal enviado',
        sent: successCount,
        failed: failCount,
        top5
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: unknown) {
    console.error('[Weekly Ranking] Erro geral:', error)
    
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
