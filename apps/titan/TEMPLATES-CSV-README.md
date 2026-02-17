# 📋 Guia dos Templates CSV

## 🥋 Template de Atletas (template-atletas.csv)

### Campos Obrigatórios
| Campo | Descrição | Formato/Exemplo |
|-------|-----------|-----------------|
| `nome_completo` | Nome completo do atleta | João Silva Santos |
| `cpf` | CPF do atleta | 123.456.789-00 ou 12345678900 |
| `data_nascimento` | Data de nascimento | DD/MM/YYYY ou YYYY-MM-DD |
| `genero` | Gênero do atleta | Masculino, Feminino |
| `graduacao` | Graduação/Faixa atual | FAIXA PRETA\|YUDANSHA, ROXA\|NIKYŪ |

### Campos Opcionais
| Campo | Descrição | Formato/Exemplo |
|-------|-----------|-----------------|
| `academia_sigla` | Sigla da academia (obrigatório para federação) | BUSHIDO, IPPON, KODOKAN |
| `rg` | Número do RG | 12.345.678-9 |
| `email` | E-mail do atleta | atleta@email.com |
| `celular` | Telefone celular | 11987654321 ou (11) 98765-4321 |
| `instagram` | Instagram do atleta | @usuario |
| `cidade` | Cidade | São Paulo |
| `estado` | UF (sigla do estado) | SP, RJ, MG |
| `dan_nivel` | Nível Dan (apenas para Faixa Preta) | 1º DAN, 2º DAN, 3º DAN |
| `data_graduacao` | Data da última graduação | DD/MM/YYYY ou YYYY-MM-DD |
| `nivel_arbitragem` | Nível de arbitragem | ARBITRO MUNICIPAL, ARBITRO ESTADUAL, ARBITRO NACIONAL |
| `observacoes` | Observações gerais | Texto livre |

### 📝 Notas Importantes - Atletas
- **Academia**: 
  - Para **Federação**: Campo `academia_sigla` é **OBRIGATÓRIO** no CSV
  - Para **Academia**: Campo não é necessário, atletas são vinculados automaticamente
- **CPF**: Aceita com ou sem pontuação (123.456.789-00 ou 12345678900)
- **Datas**: Aceita formato brasileiro (DD/MM/YYYY) ou ISO (YYYY-MM-DD)
- **Gênero**: Valores válidos: "Masculino" ou "Feminino"
- **Graduação**: Usar formato exato do banco (ex: FAIXA PRETA|YUDANSHA)
- **Dan Nível**: Preencher APENAS se graduação for FAIXA PRETA
- **Celular**: Aceita com ou sem formatação
- **Instagram**: Pode incluir ou omitir o @ inicial
- **Campos vazios**: Deixe campos opcionais em branco se não tiver a informação

---

## 🏛️ Template de Academias (template-academias.csv)

### Campos Obrigatórios
| Campo | Descrição | Formato/Exemplo |
|-------|-----------|-----------------|
| `nome` | Nome completo da academia | Academia Bushido |
| `sigla` | Sigla/apelido da academia | BUSHIDO |
| `responsavel_nome` | Nome do responsável principal | Sensei Takeshi Yamamoto |
| `responsavel_cpf` | CPF do responsável | 123.456.789-00 |
| `responsavel_email` | E-mail do responsável | contato@academia.com.br |
| `responsavel_telefone` | Telefone do responsável | 11987654321 |

### Campos Opcionais - Dados da Academia
| Campo | Descrição | Formato/Exemplo |
|-------|-----------|-----------------|
| `cnpj` | CNPJ da academia | 12.345.678/0001-90 |
| `inscricao_estadual` | Inscrição estadual | 123.456.789.012 |
| `inscricao_municipal` | Inscrição municipal | 987654321 |

### Campos Opcionais - Endereço
| Campo | Descrição | Formato/Exemplo |
|-------|-----------|-----------------|
| `endereco_cep` | CEP | 01310-100 ou 01310100 |
| `endereco_rua` | Logradouro | Avenida Paulista |
| `endereco_numero` | Número | 1578 |
| `endereco_complemento` | Complemento | Sala 1001, 2º andar |
| `endereco_bairro` | Bairro | Bela Vista |
| `endereco_cidade` | Cidade | São Paulo |
| `endereco_estado` | UF | SP |

### Campos Opcionais - Responsável Principal
| Campo | Descrição | Formato/Exemplo |
|-------|-----------|-----------------|
| `responsavel_rg` | RG do responsável | 12.345.678-9 |
| `responsavel_faixa` | Graduação do responsável | FAIXA PRETA\|YUDANSHA |

### Campos Opcionais - Responsável Técnico
| Campo | Descrição | Formato/Exemplo |
|-------|-----------|-----------------|
| `tecnico_nome` | Nome do responsável técnico | Professor Kenji Sato |
| `tecnico_cpf` | CPF do técnico | 111.222.333-00 |
| `tecnico_registro_profissional` | Registro profissional (CREF) | CREF 123456-G/SP |
| `tecnico_telefone` | Telefone do técnico | 11987654326 |
| `tecnico_email` | E-mail do técnico | tecnico@academia.com.br |

### 📝 Notas Importantes - Academias
- **Sigla**: Deve ser única, será usada para identificar a academia em listas
- **CNPJ**: Opcional, mas recomendado para academias formalizadas
- **Responsável**: Dados obrigatórios (nome, CPF, email, telefone)
- **Responsável Técnico**: Campos completamente opcionais, deixe em branco se não houver
- **CEP**: Se informado, pode auto-preencher endereço na interface
- **Campos vazios**: Deixe em branco se não tiver a informação

---

## 🚀 Como Usar

1. **Baixe o template** apropriado (atletas ou academias)
2. **Abra no Excel, Google Sheets ou Numbers**
3. **Preencha seus dados** seguindo os exemplos fornecidos
4. **Salve como CSV** (formato UTF-8 recomendado)
5. **Faça upload** na aba "Importar CSV" da página de cadastro
6. **Valide os dados** na tela de preview
7. **Confirme a importação** se tudo estiver correto

## ⚠️ Dicas Importantes

- ✅ Não altere os nomes das colunas do cabeçalho
- ✅ Mantenha os campos obrigatórios sempre preenchidos
- ✅ Use vírgula (,) como separador de campos
- ✅ Se um campo tiver vírgula no conteúdo, coloque entre aspas: "Academia XYZ, Ltda"
- ✅ Salve sempre como CSV com codificação UTF-8
- ✅ Teste primeiro com 1-2 registros antes de importar muitos
- ❌ Não deixe linhas vazias no meio dos dados
- ❌ Não use ponto e vírgula (;) como separador

## 📞 Suporte

Em caso de dúvidas sobre o preenchimento dos templates, consulte a documentação completa ou entre em contato com o suporte técnico.
