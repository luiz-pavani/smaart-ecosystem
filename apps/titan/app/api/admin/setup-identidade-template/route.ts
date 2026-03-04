import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const sql = `
      INSERT INTO public.document_templates (template_type, is_active, background_url, field_config, created_at, updated_at)
      VALUES (
        'identidade',
        true,
        '/assets/identidade-fundo.png',
        '{
          "width": 9000,
          "height": 14346,
          "nome": {
            "x": 6820,
            "y": 3800,
            "fontSize": 316,
            "fontFamily": "Avenir Next, Avenir, Arial",
            "fontWeight": "bold",
            "color": "#FFFFFF",
            "align": "right",
            "rotation": -45,
            "letterSpacing": 0
          },
          "data_nascimento_label": {
            "x": 8635,
            "y": 6150,
            "fontSize": 316,
            "fontFamily": "Avenir Next, Avenir, Arial",
            "fontWeight": "normal",
            "color": "#FFFFFF",
            "align": "right",
            "rotation": 0,
            "text": "DATA DE NASCIMENTO",
            "letterSpacing": 0
          },
          "data_nascimento": {
            "x": 8635,
            "y": 6750,
            "fontSize": 559,
            "fontFamily": "Avenir Next, Avenir, Arial",
            "fontWeight": "bold",
            "color": "#FFFFFF",
            "align": "right",
            "rotation": 0,
            "letterSpacing": 0
          },
          "graduacao_label": {
            "x": 8635,
            "y": 7950,
            "fontSize": 316,
            "fontFamily": "Avenir Next, Avenir, Arial",
            "fontWeight": "normal",
            "color": "#FFFFFF",
            "align": "right",
            "rotation": 0,
            "text": "GRADUAÇÃO",
            "letterSpacing": 0
          },
          "graduacao": {
            "x": 8635,
            "y": 8550,
            "fontSize": 559,
            "fontFamily": "Avenir Next, Avenir, Arial",
            "fontWeight": "bold",
            "color": "#FFFFFF",
            "align": "right",
            "rotation": 0,
            "letterSpacing": 0
          },
          "nivel_arbitragem_label": {
            "x": 8635,
            "y": 9750,
            "fontSize": 316,
            "fontFamily": "Avenir Next, Avenir, Arial",
            "fontWeight": "normal",
            "color": "#FFFFFF",
            "align": "right",
            "rotation": 0,
            "text": "NÍVEL DE ARBITRAGEM",
            "letterSpacing": 0
          },
          "nivel_arbitragem": {
            "x": 8635,
            "y": 10350,
            "fontSize": 559,
            "fontFamily": "Avenir Next, Avenir, Arial",
            "fontWeight": "bold",
            "color": "#FFFFFF",
            "align": "right",
            "rotation": 0,
            "letterSpacing": 0
          },
          "validade_label": {
            "x": 8635,
            "y": 11550,
            "fontSize": 316,
            "fontFamily": "Avenir Next, Avenir, Arial",
            "fontWeight": "normal",
            "color": "#FFFFFF",
            "align": "right",
            "rotation": 0,
            "text": "VALIDADE",
            "letterSpacing": 0
          },
          "validade": {
            "x": 8635,
            "y": 12150,
            "fontSize": 559,
            "fontFamily": "Avenir Next, Avenir, Arial",
            "fontWeight": "bold",
            "color": "#FFFFFF",
            "align": "right",
            "rotation": 0,
            "letterSpacing": 0
          },
          "logo_academia": {
            "x": 2180,
            "y": 1080,
            "width": 3146,
            "height": 3146,
            "allowScaleDown": true
          }
        }'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (template_type) 
      DO UPDATE SET
        is_active = true,
        field_config = EXCLUDED.field_config,
        updated_at = NOW()
    `

    // Execute raw SQL via Supabase
    const { error } = await supabase.rpc('exec_sql_as_admin', {
      sql_query: sql
    }).single()

    if (error) {
      // If RPC doesn't exist, try direct insert
      const { data: template } = await supabase
        .from('document_templates')
        .upsert({
          template_type: 'identidade',
          is_active: true,
          background_url: '/assets/identidade-fundo.png',
          field_config: {
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
        }, { onConflict: 'template_type' })
        .select()
        .single()

      if (error) {
        throw error
      }

      return NextResponse.json({ success: true, template })
    }

    return NextResponse.json({ success: true, message: 'Template inserted via RPC' })
  } catch (error) {
    console.error('Error inserting template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
