import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

serve(async (req) => {
  try {
    const { record } = await req.json()

    // O campo correto na sua tabela é 'comentario'
    const mensagem = `
🥋 *NOVA DÚVIDA NO PROFEP MAX!*
      
*Comentário:* ${record.comentario}
*Aula ID:* ${record.aula_id}
*Curso ID:* ${record.curso_id}

_Acesse o painel para responder!_
    `

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: mensagem,
        parse_mode: 'Markdown'
      })
    })

    return new Response(JSON.stringify({ message: "Notificado!" }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})