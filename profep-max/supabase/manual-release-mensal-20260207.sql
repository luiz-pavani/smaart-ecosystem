-- Liberação manual do plano mensal - SIMPLES
-- 2026-02-07

UPDATE public.profiles
SET
  status = 'active',
  plan = 'mensal',
  subscription_status = 'active',
  plan_expires_at = NOW() + INTERVAL '1 month',
  updated_at = NOW()
WHERE lower(email) IN (
  'geremias.wos@hotmail.com',
  'dentjeff2003@gmail.com',
  'george.a.camara@gmail.com',
  'jonatasaalmeida@hotmail.com',
  'gabrielorlandi74@gmail.com',
  'douglasprates@live.com'
);

-- Verificar o resultado
SELECT email, plan, subscription_status, plan_expires_at 
FROM profiles 
WHERE lower(email) IN (
  'geremias.wos@hotmail.com',
  'dentjeff2003@gmail.com',
  'george.a.camara@gmail.com',
  'jonatasaalmeida@hotmail.com',
  'gabrielorlandi74@gmail.com',
  'douglasprates@live.com'
)
ORDER BY email;
