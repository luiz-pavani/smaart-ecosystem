# 📊 AUDITORIA COMPLETA - Registros sem academia_id

**Data:** 2 de Março de 2026
**Total de registros analisados:** 1.242 atletas LRSJ

---

## 📈 RESUMO EXECUTIVO

| Métrica | Valor | % |
|---------|-------|-----|
| **Com academia_id (mapeados)** | 1.151 | 92.67% ✅ |
| **Sem academia_id (pendentes)** | 91 | 7.33% ⚠️ |
| **  → Com texto não mapeado** | 5 | 0.40% |
| **  → Com campo vazio/null** | 86 | 6.93% |

---

## 🔍 ANÁLISE DETALHADA

### 1. TEXTOS NÃO MAPEADOS (5 registros)

Encontradas **2 academias distintas** com texto não reconhecido:

#### 📍 "Dojo Cáceres Moraes" (4 atletas)
- **ID:** 3756 | **Membro:** 5352 | **Nome:** Davi Alves Martins
- **ID:** 3757 | **Membro:** 5351 | **Nome:** Isabelli Alves Martins
- **ID:** 3758 | **Membro:** 5354 | **Nome:** Maria Júlia Nunes Locks Teixeira
- **ID:** 3759 | **Membro:** 5353 | **Nome:** Miguel Pereira Aleixo

#### 📍 "• GARRA TEAM" (1 atleta)
- **ID:** 2670 | **Membro:** 4530 | **Nome:** Murillo Da Rosa

**Status dos atletas:** Todos aprovados (approved)

---

### 2. REGISTROS COM CAMPO VAZIO (86 atletas)

Amostra de registros sem vínculo a academia (primeiros 15 de 86):

1. **Alessandra do Amaral Moreira** | Membro: 4902 | Status: approved
2. **Alexandre Azambuja** | Membro: 4806 | Status: approved
3. **Alexandre Otaviano Fernandes** | Membro: 4690 | Status: approved
4. **Alyssa Torri Escalante** | Membro: 4667 | Status: approved
5. **Amanda Trein Ritter** | Membro: 5197 | Status: rejected
6. **Antônia Gabrielly da Silva Rosa** | Membro: 5197 | Status: approved
7. **Arthur da Silveira Rolim** | Membro: 4678 | Status: approved
8. **Arthur Sturmer Aumond** | Membro: 4700 | Status: approved
9. **Brenda Huff Martins** | Membro: 4696 | Status: approved
10. **Bruno Tales Huff** | Membro: 4697 | Status: approved
11. **Bryan da Veiga Dornelles** | Membro: 4915 | Status: approved
12. **Camilly de Souza Stacke** | Membro: 5289 | Status: approved
13. **Carlos Eduardo Abadi Xavier Rios** | Membro: 4903 | Status: approved
14. **Cauã Senna Correa** | Membro: 5137 | Status: approved
15. **Davi Porciuncula Luz da Silva** | Membro: 5195 | Status: approved

**Informações importantes:**
- Maioria está com status "approved"
- Apenas 1 de 5 registros com texto tem status "rejected"
- Estes atletas podem ter se cadastrado sem ligar a uma academia específica

---

## 📋 LISTA DE ACADEMIAS NO SISTEMA (29 total)

| # | Sigla | Nome |
|----|-------|------|
| 1 | ABR | Equipe Abreu |
| 2 | AJJ | Academia de Judô Judokan |
| 3 | BSO | Bandeira Social |
| 4 | CBT | Associação Combat de Artes Marciais |
| 5 | CJU | CaJu |
| 6 | DWA | DW Artes Marciais |
| 7 | FAL | Atlética Falcons Judô |
| 8 | IDR | Intendencia Departamental de Rivera |
| 9 | JCB | Judô Castelo Branco |
| 10 | JDK | Judokan Uruguay |
| 11 | JMM | Judô MadMax |
| 12 | KEJ | Kodokan Escola de Judô |
| 13 | KEN | Judô Kenkō |
| 14 | KOY | Koyama Judô |
| 15 | NHN | Nihon Judô |
| 16 | OSL | OSL Judô |
| 17 | OSS | OSS Escola de Artes Marciais |
| 18 | PDR | Plaza de Deportes Rivera |
| 19 | PJF | Projeto Judocas do Futuro |
| 20 | PRG | Judô Progresso |
| 21 | SAL | Equipe de Judô Sensei Adilson Leite |
| 22 | SAM | Samurai Dojô |
| 23 | SMJ | Santa Maria Judô |
| 24 | SOL | Academia Sol Nascente de Judô |
| 25 | SSJ | Sapucaia do Sul Judô |
| 26 | TAN | Tanemaki Judô |
| 27 | THO | Thork Jiu-Jitsu |
| 28 | TOR (1) | Dojô Toriuke |
| 29 | TOR (2) | Tora Judô Ltda |

⚠️ **Nota:** Há 2 academias com sigla duplicada "TOR" - isso pode precisar de correção após análise.

---

## 🔧 RECOMENDAÇÕES E PRÓXIMOS PASSOS

### ✅ AÇÃO 1: Criar Academias Faltantes

As 2 academias abaixo NÃO existem no sistema mas têm referências em dados:

```sql
INSERT INTO public.academias (sigla, nome, federacao_id, status)
VALUES
  ('DCM', 'Dojo Cáceres Moraes', '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d', 'ativo'),
  ('GAR', 'Garra Team', '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d', 'ativo');
```

**Impacto esperado:** Mapeará automaticamente os 5 registros com texto não reconhecido (reduzindo pendentes de 91 para 86)

---

### ✅ AÇÃO 2: Analisar 86 Registros com Campo Vazio

**Opções:**

**Opção A - Automatizado (Recomendado):**
1. Executar migration `resolve_academia_id()` novamente
2. Se não houver correspondência, deixar como está (sem academia)
3. Criar STATUS/FLAG "sem_academia_id" para rastreamento

**Opção B - Manual (Flex):**
1. Acessar https://smaart-ecosystem.vercel.app/portal/federacao/atletas
2. Usar novo dropdown de academias para atribuir manualmente
3. Válido para atletas que realmente pertencem a uma academia específica

**Opção C - Híbrida:**
1. Listar os 86 e investigar origem dos dados (qual sistema original)
2. Se possível, atualizar em lote via script
3. Caso contrário, usar página para atribuição manual

---

### ✅ AÇÃO 3: Validação Final

Após ações 1 e 2, executar:
```sql
SELECT COUNT(*) FROM user_fed_lrsj WHERE academia_id IS NULL;
```

Meta: ≤ 5% de registros sem academia_id (< 62 registros)

---

## 📌 STATUS ATUAL DA IMPLEMENTAÇÃO

| Item | Status | Detalhe |
|------|--------|---------|
| **Frontend Dropdowns** | ✅ Completo | Página atleta exibe academias e graduações como menus |
| **Banco de Dados (FK)** | ✅ Completo | academia_id é UUID com constraint FK válida |
| **Mapeamento Automático** | ✅ Completo | resolve_academia_id() criada e testada |
| **Auditoria** | ✅ Completo | Script de análise dos 91 pendentes concluído |
| **Criar Academias Faltantes** | ⏳ Pendente | Aguardando aprovação para criar DCM e GAR |
| **Mapear 86 Restantes** | ⏳ Pendente | Aguardando decisão sobre abordagem (automática/manual) |

---

## 🎯 CONCLUSÃO

**Progresso:** 92.67% dos atletas com academia definida ✅

**Gap Restante:** 91 registros (7.33%)
- **5 com solução clara:** Criar 2 academias faltantes
- **86 problemáticos:** Requerem análise de qualidade de dados / decisão estratégica

**Próxima etapa recomendada:**
1. ✅ Executar criação das 2 academias faltantes (5 min)
2. ⏳ Definir estratégia para os 86 (manual vs automático)
3. ✅ Re-mapear e validar

---

*Documento gerado via auditoria automatizada de 2 de Março de 2026*
