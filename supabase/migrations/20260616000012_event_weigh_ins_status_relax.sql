-- Relaxa CHECK de event_weigh_ins.status para aceitar 'acima' e 'abaixo'.
-- O endpoint /api/eventos/[id]/pesagem grava esses valores quando a regra do
-- evento é "registrar" (não-bloqueante). Sem este fix, INSERT falha com 23514.

alter table public.event_weigh_ins drop constraint if exists event_weigh_ins_status_check;
alter table public.event_weigh_ins add constraint event_weigh_ins_status_check
  check (status = any (array['pendente','aprovado','rejeitado','acima','abaixo']));
