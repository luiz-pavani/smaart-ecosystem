-- Migration: Atualizar posicionamento dos campos dos templates
-- Ajustes baseados nos modelos de referência reais

-- =====================================================
-- IDENTIDADE: Posicionamento exato (3000x4782px)
-- =====================================================
UPDATE public.document_templates
SET field_config = '{
  "width": 3000,
  "height": 4782,
  "nome": {
    "x": 1600,
    "y": 900,
    "fontSize": 207,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "maxWidth": 1500,
    "rotation": -45
  },
  "academia": {
    "x": 1600,
    "y": 1050,
    "fontSize": 115,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "maxWidth": 1200,
    "rotation": -45
  },
  "data_nascimento_label": {
    "x": 2300,
    "y": 1600,
    "fontSize": 117,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0,
    "text": "DATA DE NASCIMENTO"
  },
  "data_nascimento": {
    "x": 2300,
    "y": 1750,
    "fontSize": 207,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0
  },
  "graduacao_label": {
    "x": 2300,
    "y": 2100,
    "fontSize": 117,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0,
    "text": "GRADUAÇÃO"
  },
  "graduacao": {
    "x": 2300,
    "y": 2250,
    "fontSize": 207,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0,
    "maxWidth": 800
  },
  "nivel_arbitragem_label": {
    "x": 2300,
    "y": 2700,
    "fontSize": 117,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0,
    "text": "NÍVEL DE ARBITRAGEM"
  },
  "nivel_arbitragem": {
    "x": 2300,
    "y": 2850,
    "fontSize": 207,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0
  },
  "validade_label": {
    "x": 2300,
    "y": 3400,
    "fontSize": 117,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0,
    "text": "VALIDADE"
  },
  "validade": {
    "x": 2300,
    "y": 3550,
    "fontSize": 207,
    "fontFamily": "Avenir Next, Avenir, Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "rotation": 0
  },
  "logo_academia": {
    "x": 400,
    "y": 300,
    "width": 750,
    "height": 750,
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
