-- Create SUPERVIP10 coupon (75% off, card only, 10 uses)
INSERT INTO public.coupons (
  code,
  description,
  discount_percent,
  discount_fixed,
  valid_from,
  valid_until,
  max_uses,
  used_count,
  status,
  payment_method
) VALUES (
  'SUPERVIP10',
  'Campanha Super VIP 10 (75% off no 1º mês)',
  75,
  NULL,
  NOW(),
  NOW() + INTERVAL '365 days',
  10,
  0,
  'ACTIVE',
  '2'
);
