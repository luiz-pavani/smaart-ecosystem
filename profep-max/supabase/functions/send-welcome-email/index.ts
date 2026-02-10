import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { record } = await req.json()

    // record.email e record.full_name vêm da sua tabela 'profiles'
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'PROFEP MAX <judo@profepmax.com.br>',
        to: [record.email],
        subject: '🥋 Bem-vindo ao PROFEP MAX, Sensei!',
        html: `
          <div style="font-family: sans-serif; background-color: #000; color: #fff; padding: 50px; border-radius: 30px; text-align: center; border: 1px solid #333;">
            <h1 style="color: #ff0000; font-style: italic; font-size: 32px; margin-bottom: 20px;">BEM-VINDO AO DOJO, SENSEI ${record.full_name?.toUpperCase()}!</h1>
            <p style="font-size: 18px; color: #ccc;">Sua jornada rumo à maestria no judô começou.</p>
            <p style="font-size: 16px; color: #999; margin-bottom: 40px;">Você agora tem acesso à elite do conhecimento, da Kodokan ao alto rendimento.</p>
            <a href="https://profepmax.com.br/login" style="background-color: #ff0000; color: #fff; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; text-transform: uppercase;">Acessar Minhas Formações</a>
            <br /><br /><br />
            <hr style="border: 0; border-top: 1px solid #222;" />
            <p style="font-size: 10px; color: #555; margin-top: 20px;">PROFEP MAX © 2026 - Onde a tradição encontra a inovação.</p>
          </div>
        `
      })
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})