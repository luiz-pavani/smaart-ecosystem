-- Migration: Atualizar posicionamento dos campos dos templates
-- Ajustes baseados nos modelos de referência reais

-- =====================================================
-- IDENTIDADE: Posicionamento exato (3000x4782px)
-- =====================================================
UPDATE public.document_templates
SET field_config = '{
  "width": 9000,
  "height": 14346,
  "nome": {
    "x": 6200,
    "y": 7500,
    "fontSize": 316,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": -45,
    "letterSpacing": 0
  },
  "academia": {
    "x": 1300,
    "y": 2150,
    "fontSize": 96,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": -45,
    "letterSpacing": 0
  },
  "data_nascimento_label": {
    "x": 7850,
    "y": 6550,
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
    "x": 7850,
    "y": 7150,
    "fontSize": 559,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0,
    "letterSpacing": 0
  },
  "graduacao_label": {
    "x": 7850,
    "y": 8350,
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
    "x": 7850,
    "y": 8950,
    "fontSize": 559,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0,
    "letterSpacing": 0
  },
  "nivel_arbitragem_label": {
    "x": 7850,
    "y": 10150,
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
    "x": 7850,
    "y": 10750,
    "fontSize": 559,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0,
    "letterSpacing": 0
  },
  "validade_label": {
    "x": 7850,
    "y": 11950,
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
    "x": 7850,
    "y": 12550,
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
    "width": 2622,
    "height": 2622,
    "allowScaleDown": true
  }
}'::jsonb
WHERE template_type = 'identidade';

-- =====================================================
-- CERTIFICADO: Ajustar posições e adicionar logos
-- =====================================================
UPDATE public.document_templates
SET field_config = '{
  "nome": {
    "x": 421,
    "y": 345,
    "fontSize": 64,
    "fontFamily": "Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "center",
    "maxWidth": 700
  },
  "graduacao_label": {
    "x": 530,
    "y": 436,
    "fontSize": 24,
    "fontFamily": "Arial",
    "fontWeight": "italic",
    "color": "#FFFFFF",
    "align": "center",
    "text": "GRADUAÇÃO"
  },
  "graduacao": {
    "x": 530,
    "y": 481,
    "fontSize": 52,
    "fontFamily": "Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "center",
    "maxWidth": 600
  },
  "ano": {
    "x": 960,
    "y": 130,
    "fontSize": 96,
    "fontFamily": "Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "stroke": true,
    "strokeColor": "#FFFFFF",
    "strokeWidth": 2
  },
  "logo_liga": {
    "x": 55,
    "y": 475,
    "width": 130,
    "height": 150,
    "url": "fundos/logo-liga-rs.png"
  },
  "logo_academia": {
    "x": 860,
    "y": 500,
    "width": 180,
    "height": 180
  },
  "presidente": {
    "x": 540,
    "y": 640,
    "fontSize": 16,
    "fontFamily": "Arial",
    "fontWeight": "italic",
    "color": "#999999",
    "align": "center",
    "text": "PRESIDENTE"
  }
}'::jsonb
WHERE template_type = 'certificado';

-- Comentário: A lógica de rotação e stroke precisa ser implementada no componente React
