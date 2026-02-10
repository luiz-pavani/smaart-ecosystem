-- Add first-month and recurring discount fields + landing options for coupons
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS first_month_discount_percent NUMERIC,
ADD COLUMN IF NOT EXISTS first_month_discount_fixed NUMERIC,
ADD COLUMN IF NOT EXISTS recurring_discount_percent NUMERIC,
ADD COLUMN IF NOT EXISTS recurring_discount_fixed NUMERIC,
ADD COLUMN IF NOT EXISTS landing_plan TEXT,
ADD COLUMN IF NOT EXISTS landing_payment_method TEXT;
