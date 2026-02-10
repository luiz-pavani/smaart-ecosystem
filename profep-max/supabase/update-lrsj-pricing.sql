-- Atualiza precificação oficial da LRSJ (promo até 31/jan/2026)
UPDATE entities
SET settings = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(settings, '{}'::jsonb),
      '{pricing,base_price}',
      '2200'::jsonb,
      true
    ),
    '{pricing,promo_price}',
    '1880'::jsonb,
    true
  ),
  '{pricing,promo_deadline}',
  '"2026-02-01T00:00:00-03:00"'::jsonb,
  true
)
WHERE slug = 'lrsj';
