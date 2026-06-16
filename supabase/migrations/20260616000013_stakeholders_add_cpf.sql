-- CPF do stakeholder/atleta (Safe2Pay exige no checkout).
-- Antes vivia em filiacao_pedidos.cpf (e responsavel_cpf de academias),
-- mas o checkout precisa do CPF do PAYER atleta na inscrição em evento.

alter table public.stakeholders
  add column if not exists cpf text;

create index if not exists idx_stakeholders_cpf on public.stakeholders(cpf) where cpf is not null;
