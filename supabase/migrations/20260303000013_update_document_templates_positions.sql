-- Migration: Atualizar posicionamento dos campos dos templates
-- Ajustes baseados nos modelos de referência reais

-- =====================================================
-- IDENTIDADE: Ajustar todas as posições e rotação
-- =====================================================
UPDATE public.document_templates
SET field_config = '{
  "nome": {
    "x": 700,
    "y": 380,
    "fontSize": 56,
    "fontFamily": "Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "maxWidth": 500,
    "rotation": -45
  },
  "academia": {
    "x": 700,
    "y": 460,
    "fontSize": 28,
    "fontFamily": "Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "maxWidth": 400,
    "rotation": -45
  },
  "data_nascimento_label": {
    "x": 718,
    "y": 570,
    "fontSize": 17,
    "fontFamily": "Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "text": "DATA DE NASCIMENTO"
  },
  "data_nascimento": {
    "x": 718,
    "y": 615,
    "fontSize": 28,
    "fontFamily": "Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right"
  },
  "graduacao_label": {
    "x": 718,
    "y": 685,
    "fontSize": 17,
    "fontFamily": "Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "text": "GRADUAÇÃO"
  },
  "graduacao": {
    "x": 718,
    "y": 730,
    "fontSize": 28,
    "fontFamily": "Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right",
    "maxWidth": 600
  },
  "nivel_arbitragem_label": {
    "x": 718,
    "y": 800,
    "fontSize": 17,
    "fontFamily": "Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "text": "NÍVEL DE ARBITRAGEM"
  },
  "nivel_arbitragem": {
    "x": 718,
    "y": 845,
    "fontSize": 28,
    "fontFamily": "Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right"
  },
  "validade_label": {
    "x": 718,
    "y": 915,
    "fontSize": 17,
    "fontFamily": "Arial",
    "fontWeight": "normal",
    "color": "#FFFFFF",
    "align": "right",
    "text": "VALIDADE"
  },
  "validade": {
    "x": 718,
    "y": 960,
    "fontSize": 28,
    "fontFamily": "Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF",
    "align": "right"
  },
  "logo_academia": {
    "x": 150,
    "y": 130,
    "width": 200,
    "height": 200
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
