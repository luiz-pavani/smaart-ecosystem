-- FASE 2 do refactor B: backfill stakeholders + popular stakeholder_filiacoes
-- a partir de user_fed_lrsj. Normaliza valores legados de status_membro.

-- Remove unique index em telefone (você pediu pra permitir duplicação)
drop index if exists public.idx_stakeholders_telefone;

-- Backfill dados pessoais em stakeholders (caso ainda haja gaps)
update public.stakeholders s
set
  genero = coalesce(s.genero, u.genero),
  data_nascimento = coalesce(s.data_nascimento, nullif(u.data_nascimento, '')::date),
  peso_atual = coalesce(s.peso_atual, u.peso_atual),
  email = coalesce(s.email, u.email),
  telefone = coalesce(s.telefone, u.telefone),
  kyu_dan_id = coalesce(s.kyu_dan_id, u.kyu_dan_id::integer)
from public.user_fed_lrsj u
where u.stakeholder_id = s.id;

-- Migrar filiações
insert into public.stakeholder_filiacoes
  (stakeholder_id, federacao_id, academia_id,
   plano_tipo, status_membro, status_plano,
   data_adesao, data_expiracao, lote_id,
   dados_validados, validado_em, validado_por, observacoes,
   url_foto, url_documento_id, url_certificado_dan,
   nome_patch, tamanho_patch, cor_patch, siglas,
   kyu_dan_id, data_ultima_graduacao, nivel_arbitragem)
select
  u.stakeholder_id,
  '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'::uuid,
  u.academia_id,
  u.plano_tipo,
  case lower(coalesce(u.status_membro, ''))
    when 'aceito' then 'ativo'
    when 'approved' then 'aprovado'
    when 'rejected' then 'rejeitado'
    when '' then null
    else lower(u.status_membro)
  end,
  u.status_plano,
  nullif(u.data_adesao,'')::date, nullif(u.data_expiracao,'')::date,
  nullif(u.lote_id,''),
  u.dados_validados, u.validado_em, u.validado_por, u.observacoes,
  u.url_foto, u.url_documento_id, u.url_certificado_dan,
  u.nome_patch, u.tamanho_patch, u.cor_patch, u.siglas,
  u.kyu_dan_id::integer, u.data_ultima_graduacao, u.nivel_arbitragem
from public.user_fed_lrsj u
where exists (select 1 from public.stakeholders s where s.id = u.stakeholder_id)
on conflict (stakeholder_id, federacao_id) do nothing;
