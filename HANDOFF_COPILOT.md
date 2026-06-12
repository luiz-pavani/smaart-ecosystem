# Handoff — Titan Eventos (continuar no Copilot)

Documento de transferência de contexto da sessão com Claude Code para continuar o trabalho em outro assistente (GitHub Copilot Chat). Cole o conteúdo relevante no chat do Copilot ou abra este arquivo no workspace.

---

## 1. Stack & localização

- Monorepo manual (sem Turborepo). App principal: `apps/titan` (Next.js 16, App Router, TypeScript).
- Banco: Supabase (`https://risvafrrbnozyjquxvzi.supabase.co`), RLS ativo. Service role key em `.env` na raiz.
- Deploy Titan: `cd apps/titan && npx vercel deploy --prod` → alias `titan.smaartpro.com`.
- Branch principal: `main`.

## 2. Objetivo geral

Substituir dependência do Smoothcomp por sistema nativo de gerenciamento de eventos de Judô no Titan: eventos, categorias, chaves, pontuação em tempo real, VAR, transmissão.

Plano completo (5 fases) já elaborado em: `~/.claude/plans/floating-knitting-snowflake.md`. Resumo das fases:

1. **Fase 1 — Fundação:** expandir schema `eventos`, RLS por role, CRUD completo, página de detalhe/edição, substituir iframe Smoothcomp.
2. **Fase 2 — Categorias:** `event_age_groups`, `event_weight_classes`, `event_categories` (com `tempo_luta_seg`, `golden_score_seg`, modo competitivo/festival), CategoryBuilder e CategorySelector.
3. **Fase 3 — Chaves:** 6 tipos (single elim, +bronze, +repescagem IJF, double elim, round robin, group stage). Factory em `apps/titan/lib/eventos/bracket-generator.ts`. Separação por academia.
4. **Fase 4 — Pontuação + VAR:** `event_match_scores`, `event_match_var`, `scoring_modalities` (multi-modalidade via JSONB config). Placar operador (touch), placar espectador (realtime, fullscreen), VAR com MediaRecorder (buffer 60s) + Supabase Storage bucket `var-clips`.
5. **Fase 5 — Titan TV:** `event_streams`, grid de tatames ao vivo, overlay do placar sobre o stream (YouTube/RTMP/WebRTC), PPV opcional. Cronograma/ETA, rankings, waivers, pesagem digital.

## 3. Estado atual do código

**Já existe e funciona:**
- Tabelas base: `eventos`, `event_registrations`, `event_results`, `event_comunicados`.
- CRUD eventos, inscrição atleta, listagem inscrições, relatórios.
- Safe2Pay checkout integrado para inscrições pagas (produto `evento`, webhook confirma `event_registration`).
- 7 páginas de portal (atleta, academia, federação, eventos admin).
- Placar operador e espectador existem em versão inicial (com bugs — ver seção 5).
- Endpoints relevantes já inspecionados nesta sessão:
  - `apps/titan/app/api/eventos/[id]/scoring/active/route.ts` — endpoint público: retorna luta ativa + score + próximas para uma área.
  - `apps/titan/app/api/eventos/[id]/scoring/active-all/route.ts` — mesmo, mas para todas as áreas (agrupado).
  - `apps/titan/app/api/eventos/[id]/brackets/[bracketId]/matches/[matchId]/route.ts` — PATCH resultado + progressão automática (main/semifinal/repechage/double elim) + hansoku-make disciplinar (W.O. em todas as lutas pendentes do atleta desclassificado).
  - `apps/titan/app/(dashboard)/portal/eventos/[id]/scoring/[matchId]/page.tsx` — página do placar operador (arquivo grande, não foi totalmente relido por tamanho).

**Padrões de API:** routes em `apps/titan/app/api/`, `supabase.auth.getUser()` em todo handler, role check via `stakeholders.role` contra `['master_access', 'federacao_admin', 'federacao_gestor']`, writes via `supabaseAdmin`.

## 4. Categorias — critérios obrigatórios

Ao configurar uma categoria (`event_categories`) o organizador precisa definir:

1. Gênero (masculino/feminino)
2. Idade (faixa etária: Sub-11, Sub-13, Sub-15, Sub-18, Sub-21, Senior, Masters)
3. Graduação (`kyu_dan_min` / `kyu_dan_max`)
4. Peso (`weight_class_id`)
5. Tempo de luta (`tempo_luta_seg`) — defaults IJF por faixa etária
6. Tempo de golden score (`golden_score_seg`) — null = ilimitado
7. **Modo de premiação:**
   - **Competitivo** — há vencedores, 1º/2º/3º lugares, bracket eliminatório.
   - **Festival** — sem eliminação; todos os atletas recebem 1º lugar e vão ao pódio juntos (categorias infantis/iniciantes). Impacta geração de bracket (rodízio simples sem ranking), ausência de resultado eliminatório e fluxo de premiação coletiva ao final.

## 5. Bugs críticos do scoring (prioridade máxima)

Identificados em teste real em 2026-04-12. Bloqueiam uso em evento:

### Bugs
1. **Placar espectador desconectado** — não conecta/atualiza via Realtime quando há atividade na respectiva área. Investigar subscription do `event_match_scores` no componente do placar espectador e confirmar que Supabase Realtime está habilitado na tabela.
2. **Golden Score cronômetro travado** — cronômetro não sai do zero quando entra em Golden Score.
3. **Lógica de fim de tempo incorreta** — hoje vai para Golden Score mesmo com placar diferente. Regra correta do judô:
   - Tempo acabou **com pontuação diferente** → **vitória** de quem tem mais pontos (finaliza a luta).
   - Tempo acabou **com pontuação empatada** → **Golden Score**.
   - Requer revisão da máquina de estados do combate na página de scoring.

### Melhorias (depois dos bugs)
4. **Sistema de pesagem** — não existe. Criar fluxo de check-in de peso no dia do evento, validando contra peso da categoria inscrita.
5. **VAR** — expandir o que já existe (base ok). Buffer de 60s via `MediaRecorder`, upload para `var-clips` em Supabase Storage, slow-motion (0.25x/0.5x), decisão (mantida/revertida), overlay no placar espectador.
6. **Layout do placar do operador** — deve caber inteiro na tela sem rolagem. Botões de **desfazer pontuação** devem ficar **abaixo** dos botões de pontuação (hoje estão ao lado). Melhor aproveitamento do espaço horizontal.
7. **Auto-load da próxima luta** — após registrar vencedor, carregar automaticamente a próxima luta da área (sem voltar pra listagem).

**Ordem sugerida:** bugs 1 → 3 → 2, depois melhorias 6 → 7 → 4 → 5.

## 6. Fluxo digital pré-evento (referência)

Página do evento → login/cadastro → inscrição (seleção de categoria + peso) → pagamento Safe2Pay → confirmação + campanha "Eu Vou" → comunicação WhatsApp automatizada (lembretes, horários, alertas de mudança de luta/área em tempo real).

## 7. Fluxo do atleta no evento (referência)

Check-in → pesagem → aquecimento → chamada para luta → luta → resultado → (se campeão) premiação → entrevista pós-luta.

## 8. Preferências do usuário (relevantes pro handoff)

- **Autonomia total:** executar tool calls sem pedir confirmação, inclusive operações destrutivas (git, deploys, edições). Pra aplicar em outro assistente: pode seguir editando/rodando direto.
- **Git commits:** em sessões longas do Claude o commit costuma travar; por isso o padrão é entregar o código pronto e o usuário commitar manualmente no terminal.
- **Deploy:** sempre `cd apps/titan && npx vercel deploy --prod`.

## 9. Onde está a memória persistente (para copiar mais detalhes se precisar)

`~/.claude/projects/-Users-judo365-Documents-MASTER-ESPORTES-SMAART-PRO-smaart-ecosystem/memory/`

Arquivos relevantes para eventos:
- `project_titan_scoring_bugs.md` — origem dos bugs da seção 5.
- `project_titan_category_config.md` — origem da seção 4.
- `project_titan_athlete_event_flow.md` — fluxo físico do atleta.
- `project_titan_athlete_digital_flow.md` — fluxo digital pré-evento.
- `project_titan_event_comms.md` — comunicação WhatsApp.
- Plano completo das 5 fases: `~/.claude/plans/floating-knitting-snowflake.md`.

## 10. Primeiro passo sugerido no Copilot

Abrir `apps/titan/app/(dashboard)/portal/eventos/[id]/scoring/[matchId]/page.tsx` e resolver os 3 bugs na ordem 1 → 3 → 2:

1. Conferir se o placar espectador (`/eventos/[id]/placar` ou similar) está usando `supabase.channel().on('postgres_changes', ...)` em `event_match_scores` filtrado por área, e se a tabela tem Realtime ligado no dashboard do Supabase.
2. Corrigir a máquina de estados do fim de tempo: ao zerar `clock_seconds`, comparar pontuação dos dois atletas antes de entrar em Golden Score.
3. Garantir que, ao transicionar para Golden Score, o cronômetro é reiniciado com `event_categories.golden_score_seg` e volta a correr.
