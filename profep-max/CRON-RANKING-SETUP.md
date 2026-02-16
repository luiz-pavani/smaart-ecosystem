# Configuração do Cron Job - Ranking Semanal

## 📧 Email de Ranking Semanal (Top 5)

O email de ranking é enviado **toda sexta-feira às 18h** para todos os usuários ativos da plataforma.

### ✅ Função Deploy

A Edge Function `send-weekly-ranking` já está implantada em:
```
https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-weekly-ranking
```

### ⚙️ Como Configurar o Cron Job

#### Opção 1: Supabase Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/sxmrqiohfrktwlkwmfyr
2. Vá em **Database** → **Cron Jobs**
3. Clique em **Create a new cron job**
4. Preencha:
   - **Name**: `weekly-ranking-email`
   - **Schedule**: `0 21 * * 5` (sexta às 21h UTC = 18h BRT)
   - **Command**: 
     ```sql
     SELECT net.http_post(
       url := 'https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-weekly-ranking',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
       )
     );
     ```

#### Opção 2: SQL Editor

Execute no **SQL Editor** do Supabase:

```sql
-- 1. Habilitar a extensão pg_cron (se ainda não estiver)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Criar o cron job
SELECT cron.schedule(
  'weekly-ranking-email',           -- Nome do job
  '0 21 * * 5',                     -- Sexta às 21h UTC (18h BRT)
  $$
  SELECT net.http_post(
    url := 'https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-weekly-ranking',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

### 🔍 Verificar Cron Jobs Ativos

```sql
SELECT * FROM cron.job;
```

### 🗑️ Remover Cron Job (se necessário)

```sql
SELECT cron.unschedule('weekly-ranking-email');
```

### 📊 Formato do Cron

```
0 21 * * 5
│ │  │ │ │
│ │  │ │ └─── Dia da semana (0-6, sendo 0=domingo, 5=sexta)
│ │  │ └───── Mês (1-12)
│ │  └─────── Dia do mês (1-31)
│ └────────── Hora (0-23)
└──────────── Minuto (0-59)
```

**Exemplo**: `0 21 * * 5` = Sexta-feira às 21h UTC

### 🌎 Ajuste de Timezone

- **UTC**: Horário padrão do Supabase
- **BRT (Brasil)**: UTC -3
- **Para enviar às 18h BRT**: usar `21` na hora (18 + 3 = 21h UTC)

### 🧪 Testar Manualmente

Antes de configurar o cron, teste a função:

```bash
curl -X POST \
  https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-weekly-ranking \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### 📧 O que o Email Contém

Cada usuário recebe:
- **Top 5 da semana** com medalhas (🥇🥈🥉)
- **Sua posição** no ranking
- **Seus pontos** atuais
- **Mensagem especial** se estiver no Top 5
- **Dicas** de como subir no ranking
- **Botões** para ver ranking completo e fazer aulas

### 🔐 Variáveis de Ambiente Necessárias

Certifique-se de que a Edge Function tem acesso a:
- `RESEND_API_KEY`: re_your_api_key_here
- `SUPABASE_URL`: https://sxmrqiohfrktwlkwmfyr.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: (configurado automaticamente)

### 📝 Logs e Monitoramento

Acompanhe o envio em:
1. **Supabase Dashboard** → Functions → send-weekly-ranking → Logs
2. **Resend Dashboard** → https://resend.com/emails

### ⏰ Próximos Envios

Com o cron configurado, os emails serão enviados automaticamente:
- **Próxima sexta**: 18h BRT
- **Periodicidade**: Semanal
- **Destinatários**: Todos os usuários com `plano = 'ATIVO'`

---

## ✅ Checklist de Implantação

- [x] Edge Function `send-weekly-ranking` deployed
- [x] Email template criado e testado
- [ ] Cron job configurado no Supabase
- [ ] Teste manual realizado com sucesso
- [ ] Monitoramento ativo nos logs
- [ ] Domínio verificado no Resend
