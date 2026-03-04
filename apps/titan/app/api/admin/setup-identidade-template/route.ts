import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    const fieldConfig = {
      width: 9000,
      height: 14346,
      nome: { x: 6820, y: 3800, fontSize: 316, fontFamily: "Avenir Next, Avenir, Arial", fontWeight: "bold", color: "#FFFFFF", align: "right", rotation: -45, letterSpacing: 0 },
      data_nascimento_label: { x: 8635, y: 6150, fontSize: 316, fontFamily: "Avenir Next, Avenir, Arial", fontWeight: "normal", color: "#FFFFFF", align: "right", rotation: 0, text: "DATA DE NASCIMENTO", letterSpacing: 0 },
      data_nascimento: { x: 8635, y: 6750, fontSize: 559, fontFamily: "Avenir Next, Avenir, Arial", fontWeight: "bold", color: "#FFFFFF", align: "right", rotation: 0, letterSpacing: 0 },
      graduacao_label: { x: 8635, y: 7950, fontSize: 316, fontFamily: "Avenir Next, Avenir, Arial", fontWeight: "normal", color: "#FFFFFF", align: "right", rotation: 0, text: "GRADUAÇÃO", letterSpacing: 0 },
      graduacao: { x: 8635, y: 8550, fontSize: 559, fontFamily: "Avenir Next, Avenir, Arial", fontWeight: "bold", color: "#FFFFFF", align: "right", rotation: 0, letterSpacing: 0 },
      nivel_arbitragem_label: { x: 8635, y: 9750, fontSize: 316, fontFamily: "Avenir Next, Avenir, Arial", fontWeight: "normal", color: "#FFFFFF", align: "right", rotation: 0, text: "NÍVEL DE ARBITRAGEM", letterSpacing: 0 },
      nivel_arbitragem: { x: 8635, y: 10350, fontSize: 559, fontFamily: "Avenir Next, Avenir, Arial", fontWeight: "bold", color: "#FFFFFF", align: "right", rotation: 0, letterSpacing: 0 },
      validade_label: { x: 8635, y: 11550, fontSize: 316, fontFamily: "Avenir Next, Avenir, Arial", fontWeight: "normal", color: "#FFFFFF", align: "right", rotation: 0, text: "VALIDADE", letterSpacing: 0 },
      validade: { x: 8635, y: 12150, fontSize: 559, fontFamily: "Avenir Next, Avenir, Arial", fontWeight: "bold", color: "#FFFFFF", align: "right", rotation: 0, letterSpacing: 0 },
      logo_academia: { x: 2180, y: 1080, width: 3146, height: 3146, allowScaleDown: true }
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/document_templates?template_type=eq.identidade`,
      {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Prefer': 'return=representation',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ field_config: fieldConfig })
      }
    )

    if (!response.ok && response.status !== 204) {
      const text = await response.text()
      console.error('Supabase error:', response.status, text)
      
      // If PATCH fails (204 or empty result), try INSERT
      if (response.status === 204 || response.status === 404) {
        const insertResponse = await fetch(
          `${supabaseUrl}/rest/v1/document_templates`,
          {
            method: 'POST',
            headers: {
              'apikey': serviceKey,
              'Prefer': 'return=representation',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              template_type: 'identidade',
              is_active: true,
              background_url: '/assets/identidade-fundo.png',
              field_config: fieldConfig
            })
          }
        )
        
        if (insertResponse.status === 201) {
          const data = await insertResponse.json()
          return NextResponse.json({ success: true, action: 'insert', data })
        }
      }
      
      return NextResponse.json({ error: text || 'Failed to update template' }, { status: response.status })
    }

    return NextResponse.json({ success: true, action: 'update', status: response.status })
  } catch (error) {
    console.error('Error setting up template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
