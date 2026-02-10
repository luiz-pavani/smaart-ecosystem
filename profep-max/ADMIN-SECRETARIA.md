# 📋 Painel de Secretaria - Documentação Admin

## Funcionalidades Implementadas

### 1. Edição Completa de Dados do Assinante

Na página `/admin/secretaria`, ao clicar em qualquer aluno, você pode editar:

- ✅ **Nome Completo**
- ✅ **Email**
- ✅ **CPF**
- ✅ **Telefone**
- ✅ **Instagram**
- ✅ **Plano** (Mensal, Anual, Vitalício, Free)

**Botão:** "SALVAR ALTERAÇÕES" - Atualiza todas as informações no banco de dados.

---

### 2. Alteração de Senha pelo Admin

Dentro do dossiê do aluno, há uma seção "Alterar Senha":

- Digite a nova senha (mínimo 6 caracteres)
- Clique em "DEFINIR NOVA SENHA"
- A senha é alterada imediatamente no Supabase Auth
- O aluno pode fazer login com a nova senha

**⚠️ Importante:** Esta senha não expira e o aluno não receberá notificação automática. Comunique a nova senha diretamente ao aluno.

---

### 3. Envio de Email para Redefinir Senha

No rodapé do dossiê do aluno:

- Botão "ENVIAR EMAIL DE RESET"
- Envia um link de redefinição de senha para o email do aluno
- O aluno escolhe sua própria senha ao clicar no link
- Mais seguro que definir senha manualmente

**Recomendação:** Use esta opção quando o aluno solicitar reset de senha.

---

### 4. Criação de Novos Alunos

**Botão:** "+ NOVO ALUNO" (topo da página, ao lado da busca)

#### Campos do Formulário:

1. **Nome Completo*** (obrigatório)
2. **Email*** (obrigatório)
3. **CPF** (opcional)
4. **Telefone** (opcional)
5. **Plano** (Mensal, Anual, Vitalício, Free)
6. **Valor Mensal (R$)** - Permite definir preço customizado (padrão: 49.90)

#### Processo Automático:

1. ✅ Gera senha temporária automaticamente (10 caracteres aleatórios)
2. ✅ Cria usuário no Supabase Auth com email confirmado
3. ✅ Cria perfil na tabela `profiles` com status ATIVO
4. ✅ Envia email automático de redefinição de senha
5. ✅ O aluno recebe o email e define sua própria senha

**📧 Email Enviado:** O aluno receberá um email do Supabase com link para criar sua senha.

---

## Fluxo Recomendado

### Para Novos Alunos Pagos Manualmente:

1. Clique em "+ NOVO ALUNO"
2. Preencha nome e email (obrigatórios)
3. Selecione o plano adequado (ex: Mensal)
4. Defina o valor mensal (ex: 39.90 para desconto especial)
5. Clique em "CRIAR ALUNO"
6. O aluno recebe email e define sua senha
7. O aluno já pode acessar a plataforma

### Para Resetar Senha de Aluno Existente:

**Opção 1 (Recomendada):**
- Abra o dossiê do aluno
- Clique em "ENVIAR EMAIL DE RESET"
- O aluno recebe email e define nova senha

**Opção 2 (Manual):**
- Abra o dossiê do aluno
- Seção "Alterar Senha"
- Digite nova senha (mínimo 6 caracteres)
- Clique em "DEFINIR NOVA SENHA"
- Comunique a nova senha ao aluno

---

## Endpoints da API

### POST `/api/admin/update-password`
```json
{
  "userId": "uuid-do-usuario",
  "newPassword": "novaSenha123"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Senha atualizada com sucesso"
}
```

---

### POST `/api/admin/create-student`
```json
{
  "full_name": "João Silva",
  "email": "joao@exemplo.com",
  "cpf": "000.000.000-00",
  "phone": "(11) 99999-9999",
  "plan": "mensal",
  "valor_mensal": "49.90"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Aluno criado com sucesso",
  "userId": "uuid-gerado",
  "email": "joao@exemplo.com"
}
```

---

## Segurança

### Permissões Necessárias:

- ✅ `SUPABASE_SERVICE_ROLE_KEY` configurada no `.env`
- ✅ Acesso apenas para usuários admin
- ✅ Validações de email e senha implementadas

### Proteção de Dados:

- Senhas temporárias geradas aleatoriamente (10 caracteres)
- Emails de reset com tokens seguros do Supabase
- Service role key nunca exposta ao frontend

---

## Valores Mensais Customizados

Você pode definir valores diferentes para cada aluno:

| Situação | Valor Sugerido |
|----------|----------------|
| Preço Cheio | R$ 49,90 |
| Desconto Cartão | R$ 39,90 |
| Promocional | R$ 29,90 |
| Plano Anual | R$ 359,00 (anual) |
| Vitalício | R$ 997,00 (único) |

**Nota:** O campo "Valor Mensal" no formulário serve para referência. A cobrança automática ainda depende da integração com Safe2Pay.

---

## Troubleshooting

### Erro: "Email já existe"
- O email já está cadastrado no sistema
- Verifique na lista de alunos se o usuário já existe
- Use a busca para localizar por email

### Erro: "Senha deve ter no mínimo 6 caracteres"
- Digite pelo menos 6 caracteres na nova senha
- Supabase exige mínimo de 6 caracteres

### Email de reset não chega
- Verifique caixa de spam do aluno
- Confirme que o email está correto no cadastro
- Aguarde até 5 minutos (pode haver delay)

---

## Campos Editáveis vs Somente Leitura

### ✅ Editáveis no Dossiê:
- Nome Completo
- Email
- CPF
- Telefone
- Instagram
- Plano

### 📊 Somente Leitura:
- ID do Usuário
- Data de Cadastro
- Histórico de Vendas
- Resultados de Exames
- Status de Migração (ATIVO)

---

## Próximos Passos

Para futuras melhorias, considere:

1. [ ] Tabela `custom_pricing` para valores mensais diferenciados
2. [ ] Notificação via Telegram quando admin criar novo aluno
3. [ ] Histórico de alterações no perfil do aluno
4. [ ] Exportação de lista de alunos em CSV/Excel
5. [ ] Filtros avançados (por plano, status, data de cadastro)

---

**Desenvolvido para Profep MAX**  
*Sistema de gestão de assinantes e secretaria educacional*
