-- FASE 3 do refactor B: substitui tabela user_fed_lrsj por VIEW de compatibilidade.
-- Código legado (157 query points + 58 query points) continua funcionando.
-- INSTEAD OF UPDATE redireciona writes para stakeholders + stakeholder_filiacoes.

alter table if exists public.user_fed_lrsj rename to user_fed_lrsj_old;

create or replace view public.user_fed_lrsj as
select
  f.stakeholder_id,
  s.nome_completo,
  s.email,
  s.telefone,
  s.genero,
  s.data_nascimento::text as data_nascimento,
  (case
    when s.data_nascimento is not null
    then extract(year from age(current_date, s.data_nascimento))::text
    else null
  end) as idade,
  s.peso_atual,
  s.kyu_dan_id::bigint as kyu_dan_id,
  f.federacao_id::text as federacao_id,
  f.academia_id,
  f.plano_tipo, f.status_membro, f.status_plano,
  f.data_adesao::text as data_adesao,
  f.data_expiracao::text as data_expiracao,
  f.lote_id,
  f.dados_validados, f.validado_em, f.validado_por, f.observacoes,
  f.url_foto, f.url_documento_id, f.url_certificado_dan,
  f.nome_patch, f.tamanho_patch, f.cor_patch, f.siglas,
  f.data_ultima_graduacao, f.nivel_arbitragem,
  f.updated_at,
  null::text as nacionalidade,
  null::text as cidade,
  null::text as estado,
  null::text as pais,
  null::text as academias
from public.stakeholder_filiacoes f
join public.stakeholders s on s.id = f.stakeholder_id
where f.federacao_id = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'::uuid;

create or replace function public.user_fed_lrsj_update_redirect()
returns trigger language plpgsql security definer
set search_path to 'public', 'pg_temp' as $$
begin
  if new.nome_completo is distinct from old.nome_completo
    or new.email is distinct from old.email
    or new.telefone is distinct from old.telefone
    or new.genero is distinct from old.genero
    or new.peso_atual is distinct from old.peso_atual
    or new.data_nascimento is distinct from old.data_nascimento
    or new.kyu_dan_id is distinct from old.kyu_dan_id
  then
    update public.stakeholders set
      nome_completo = coalesce(new.nome_completo, nome_completo),
      email = coalesce(new.email, email),
      telefone = coalesce(new.telefone, telefone),
      genero = coalesce(new.genero, genero),
      peso_atual = coalesce(new.peso_atual, peso_atual),
      data_nascimento = coalesce(nullif(new.data_nascimento,'')::date, data_nascimento),
      kyu_dan_id = coalesce(new.kyu_dan_id::integer, kyu_dan_id)
    where id = new.stakeholder_id;
  end if;

  update public.stakeholder_filiacoes set
    academia_id = coalesce(new.academia_id, academia_id),
    plano_tipo = coalesce(new.plano_tipo, plano_tipo),
    status_membro = coalesce(
      case lower(coalesce(new.status_membro,''))
        when 'aceito' then 'ativo'
        when 'approved' then 'aprovado'
        when 'rejected' then 'rejeitado'
        when '' then null
        else lower(new.status_membro)
      end,
      status_membro
    ),
    status_plano = coalesce(new.status_plano, status_plano),
    data_adesao = coalesce(nullif(new.data_adesao,'')::date, data_adesao),
    data_expiracao = coalesce(nullif(new.data_expiracao,'')::date, data_expiracao),
    lote_id = coalesce(new.lote_id, lote_id),
    dados_validados = coalesce(new.dados_validados, dados_validados),
    validado_em = coalesce(new.validado_em, validado_em),
    validado_por = coalesce(new.validado_por, validado_por),
    observacoes = coalesce(new.observacoes, observacoes),
    url_foto = coalesce(new.url_foto, url_foto),
    url_documento_id = coalesce(new.url_documento_id, url_documento_id),
    url_certificado_dan = coalesce(new.url_certificado_dan, url_certificado_dan),
    nome_patch = coalesce(new.nome_patch, nome_patch),
    tamanho_patch = coalesce(new.tamanho_patch, tamanho_patch),
    cor_patch = coalesce(new.cor_patch, cor_patch),
    siglas = coalesce(new.siglas, siglas),
    data_ultima_graduacao = coalesce(new.data_ultima_graduacao, data_ultima_graduacao),
    nivel_arbitragem = coalesce(new.nivel_arbitragem, nivel_arbitragem)
  where stakeholder_id = new.stakeholder_id
    and federacao_id = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'::uuid;

  return new;
end $$;

drop trigger if exists trg_user_fed_lrsj_update on public.user_fed_lrsj;
create trigger trg_user_fed_lrsj_update
  instead of update on public.user_fed_lrsj
  for each row execute function public.user_fed_lrsj_update_redirect();
