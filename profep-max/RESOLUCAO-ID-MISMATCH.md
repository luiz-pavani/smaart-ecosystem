# Resolução: Problema de Acesso - IDs Incompatíveis

## Problema Reportado

**Data**: 15/12/2024
**Usuário**: ricolima2@gmail.com
**Sintomas**:
- Usuário relata não ter acesso apesar de assinatura ativa
- Admin não consegue resetar senha com erro: "User not found"
- Profile existe e está ativo no banco de dados

## Diagnóstico

### Investigação Inicial
Suspeitava-se de perfil órfão (profile sem auth.users), mas o diagnóstico revelou problema diferente:

```
Profile ID:    bde77f8a-9c62-468e-b8d3-37ef7e1d3d0a
Auth User ID:  39afcc77-f318-4c7c-9513-d420a3915202
```

### Causa Raiz
**IDs incompatíveis entre `auth.users` e `profiles` tables**

O usuário PODE fazer login (registro em auth.users existe), mas o sistema não carrega os dados do perfil porque busca usando o auth.user.id, que não corresponde ao profile.id no banco.

### Como Isso Acontece?

Possíveis cenários:
1. **Signup normal + criação manual de profile**: Usuário se cadastrou normalmente (criando auth.users), mas depois alguém criou um profile manualmente com ID diferente
2. **Webhook criando profile antes do signup**: Safe2Pay webhook cria profile com ID customizado antes do usuário completar signup
3. **Múltiplos signups**: Usuário tentou criar conta várias vezes, criando registros duplicados
4. **Migração de dados**: Profile foi importado de outro sistema com ID preservado

## Solução Aplicada

### Script Utilizado
`scripts/fix-orphan-profile.js`

### Ações Executadas

1. **Identificou o problema**:
   ```bash
   node scripts/simple-check.js
   ```
   Resultado: Confirmou IDs diferentes

2. **Sincronizou os IDs**:
   ```bash
   node scripts/fix-orphan-profile.js ricolima2@gmail.com
   ```
   
3. **Atualizações realizadas**:
   - ✅ Atualizado `profiles.id` de `bde77f8a-9c62-468e-b8d3-37ef7e1d3d0a` para `39afcc77-f318-4c7c-9513-d420a3915202`
   - ✅ Garantido que referências em `vendas` e `subscription_events` usam email (não afetadas)
   - ✅ Verificado que ID agora corresponde ao auth.user.id

4. **Verificação final**:
   ```bash
   node scripts/diagnose-user.js ricolima2@gmail.com
   ```
   Resultado: ✅ SISTEMA OK

## Resultado

### Estado Final
- **Auth User ID**: `39afcc77-f318-4c7c-9513-d420a3915202` ✅
- **Profile ID**: `39afcc77-f318-4c7c-9513-d420a3915202` ✅
- **IDs correspondem**: SIM ✅
- **Status**: active
- **Plano**: mensal
- **Expira em**: 2026-03-15
- **Cursos visíveis**: 23 (correto - exclui 2 LRSJ)

### Funcionalidades Restauradas
1. ✅ Login funcionando
2. ✅ Carregamento de dados do perfil
3. ✅ Acesso aos 23 cursos disponíveis
4. ✅ Reset de senha pelo Admin agora funciona
5. ✅ Dashboard carrega dados corretamente

## Prevenção

### Para Evitar esse Problema no Futuro

1. **Nunca criar profiles manualmente no banco**
   - Sempre usar Supabase Auth signup
   - Deixar trigger `on_auth_user_created` criar o profile automaticamente

2. **Webhooks Safe2Pay**
   - Verificar se usuário existe em `auth.users` antes de criar profile
   - Se não existir, criar convite ou aguardar signup
   - Nunca assumir ID customizado

3. **Validação contínua**
   - Executar `scripts/health-check.js` periodicamente
   - Adicionar query para detectar ID mismatches:
   ```sql
   SELECT p.email, p.id as profile_id, u.id as auth_id
   FROM profiles p
   LEFT JOIN auth.users u ON u.email = p.email
   WHERE p.id != u.id;
   ```

4. **Migração de dados**
   - Sempre usar `supabase.auth.admin.createUser()` primeiro
   - Depois criar profile usando o ID retornado

## Scripts de Diagnóstico

### Verificar ID mismatch
```bash
node scripts/simple-check.js
```

### Diagnosticar usuário completo
```bash
node scripts/diagnose-user.js email@example.com
```

### Corrigir ID mismatch
```bash
node scripts/fix-orphan-profile.js email@example.com [senha-temporaria]
```

### Health check geral
```bash
node scripts/health-check.js
```

## Lições Aprendidas

1. **"User not found" no reset de senha pode significar**:
   - Usuário não existe em auth.users OU
   - IDs incompatíveis entre auth.users e profiles

2. **Sempre verificar ambas as tabelas**:
   - `auth.users` (autenticação)
   - `profiles` (dados do usuário)

3. **Profile.id DEVE ser igual a auth.user.id**:
   - É uma constraint implícita do Supabase
   - RLS policies dependem disso (`auth.uid()`)

4. **Safe2Pay webhook precisa considerar signup assíncrono**:
   - Pagamento pode ser confirmado antes do usuário criar conta
   - Sistema deve aguardar signup ou criar convite

## Referências

- Script de correção: `scripts/fix-orphan-profile.js`
- Script de diagnóstico: `scripts/simple-check.js`
- Diagnóstico completo: `scripts/diagnose-user.js`
- Health check: `scripts/health-check.js`

---

**Resolvido em**: 15/12/2024  
**Tempo total**: ~30 minutos  
**Status**: ✅ RESOLVIDO
