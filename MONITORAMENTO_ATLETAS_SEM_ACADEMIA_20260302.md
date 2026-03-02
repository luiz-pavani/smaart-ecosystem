# Relatório de Monitoramento: Atletas Sem Academia

**Data:** 02/03/2026 09:47  
**Total:** 86 atletas

## 📊 Resumo Executivo

De acordo com a **Auditoria de Mapeamento de Academias** (executada em 19/02/2026), temos:

- **Total de atletas**: 1.242
- **Mapeados**: 1.156 (93%)
- **Sem academia**: 86 (6.9%)

## 🎯 Estratégia (AÇÃO 2 - Opção A)

Conforme decisão tomada, estes atletas serão:
- ✅ Mantidos com `academia_id = NULL`
- ✅ Monitorados através da view `vw_atletas_sem_academia`
- ✅ Academia será cadastrada quando/se informada pelo atleta ou federação

## 📋 Categorização

### Sem Informação de Academia (86)

Atletas que não informaram academia no cadastro original.

**Amostra (primeiros 20):**

| ID | Nome Completo |
|----|---------------|
| 2639 | João Vinicius Botelho Folgearini |
| 2649 | GABRIEL FAGUNDES MAUSOFF |
| 2651 | ALEXANDRE OTAVIANO FERNANDES |
| 2652 | ARTHUR STURMER AUMOND |
| 2653 | JONATAS MACHADO FEIJÓ |
| 2655 | LEANDRO VARGAS |
| 2677 | Marcel Nunes |
| 2687 | Gustavo MOREIRA VARGAS |
| 2699 | Gabriel Vargas |
| 2723 | DÊNNER DORNELLES |
| 2802 | Thayná Silva |
| 2830 | João Silva |
| 2935 | CAUÃ SENNA CORREA |
| 2937 | Gibran Vasconcelos |
| 2938 | GUSTAVO FERNANDES OLECHOWICZ |
| 2939 | HENRIQUE SELAU DA SILVA |
| 2940 | JULIO CESAR RODRIGUES |
| 2941 | KETLIN CAROLINE ALVES GODOY |
| 3152 | Gabriel Cunha |
| 3050 | Nicolas Eckhardt |


### Com Texto Não Mapeado (0)

Atletas com texto de academia que não pôde ser mapeado automaticamente.

**Lista Completa:**

| ID | Nome Completo | Academia (texto) |
|----|---------------|------------------|


## 🔍 Como Monitorar

### Via SQL (Supabase Dashboard)

```sql
-- Ver todos os atletas sem academia
SELECT * FROM vw_atletas_sem_academia;

-- Contar por motivo
SELECT motivo_sem_academia, COUNT(*) as total
FROM vw_atletas_sem_academia
GROUP BY motivo_sem_academia;

-- Ver apenas os que tinham texto mas não foram mapeados
SELECT * FROM vw_atletas_sem_academia
WHERE motivo_sem_academia = 'ACADEMIA_NAO_CADASTRADA';
```

### Via Python (API)

```python
import requests

url = "https://risvafrrbnozyjquxvzi.supabase.co/rest/v1/user_fed_lrsj"
params = {
    "select": "id,nome_completo,academias",
    "academia_id": "is.null",
    "limit": 100
}
headers = {"apikey": "YOUR_KEY", "Authorization": "Bearer YOUR_KEY"}

resp = requests.get(url, params=params, headers=headers)
print(f"Total sem academia: {len(resp.json())}")
```

## 📅 Próximas Ações

1. **Aplicar migration SQL**
   - Arquivo: `supabase/migrations/20260302000005_view_atletas_sem_academia.sql`
   - Local: Supabase Dashboard → SQL Editor

2. **Revisão Mensal**
   - Executar query na view para ver evolução
   - Identificar se novos atletas foram cadastrados

3. **Contato com Atletas (opcional)**
   - Se necessário no futuro, entrar em contato para coletar informação de academia

## ✅ Status: Monitoramento Ativo

Este relatório será atualizado conforme necessário. A view está pronta para ser consultada a qualquer momento.

---

**Relatório gerado automaticamente** | Smaart Pro Ecosystem  
**Auditoria**: AUDITORIA_91_RELATORIO_COMPLETO.md
