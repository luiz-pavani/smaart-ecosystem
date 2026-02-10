-- ============================================================================
-- CHECKLIST: Diagrama completo do fluxo de pagamento Safe2Pay
-- ============================================================================

-- 1. LOGS DE CALLBACK (confira se o webhook está recebendo)
select count(*) as total_callbacks, 
       max(created_at) as ultimo_callback,
       count(distinct email) as emails_unicos
from public.payment_webhook_logs;

-- Detalhe dos últimos callbacks
select created_at, email, transaction_id, subscription_id, status_id, 
       payload->>'EventType' as event_type
from public.payment_webhook_logs
order by created_at desc
limit 20;

-- ============================================================================
-- 2. TRANSAÇÕES GRAVADAS (confira se vendas está sendo preenchido)
select count(*) as total_vendas,
       max(created_at) as ultima_venda,
       count(distinct email) as clientes_unicos
from public.vendas;

-- Detalhe das últimas vendas
select created_at, email, valor, plano, metodo, transaction_id, subscription_id
from public.vendas
order by created_at desc
limit 20;

-- ============================================================================
-- 3. PROFILES ATIVADOS (confira quantos usuários estão com status='active')
select count(*) as profiles_ativos,
       count(case when plan is not null then 1 end) as com_plano,
       count(case when id_subscription is not null then 1 end) as com_subscription
from public.profiles
where status = 'active';

-- Detalhe de profiles ativos
select id, email, status, plan, subscription_status, id_subscription, plan_expires_at, updated_at
from public.profiles
where status = 'active'
order by updated_at desc
limit 20;

-- ============================================================================
-- 4. VALIDAÇÃO: Email único (checagem de duplicatas)
select lower(email) as email_lower, count(*) as qtd
from public.profiles
where email is not null and trim(email) <> ''
group by lower(email)
having count(*) > 1;

-- Se a query acima retornar linhas: existem emails duplicados que precisam ser resolvidos

-- ============================================================================
-- 5. ATIVAÇÃO MANUAL (se precisar ativar um usuário específico)
-- Exemplo: para luizpavani@me.com (copie e altere o email conforme necessário)

do $$
declare
  v_email text := lower(trim('luizpavani@me.com'));
  v_uid uuid;
  v_updated boolean;
begin
  select id into v_uid
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_uid is null then
    raise exception 'auth.users não encontrado para %', v_email;
  end if;

  update public.profiles
  set
    email = v_email,
    status = 'active',
    plan = 'mensal',
    subscription_status = 'active',
    plan_expires_at = now() + interval '1 month',
    updated_at = now()
  where id = v_uid;

  if found then
    raise notice 'Profile atualizado para %', v_email;
  else
    insert into public.profiles (
      id, email, status, plan, subscription_status, plan_expires_at, role, created_at, updated_at
    ) values (
      v_uid, v_email, 'active', 'mensal', 'active', now() + interval '1 month', 'student', now(), now()
    );
    raise notice 'Profile criado para %', v_email;
  end if;
end $$;

-- ============================================================================
-- SUMÁRIO (rode todos os SELECT acima para ter visão completa)
-- ============================================================================
