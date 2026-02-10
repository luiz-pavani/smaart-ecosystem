# Implementação - Modal de Termos e Condições para Federações

## Resumo das Mudanças

Foi implementada uma etapa de concordância obrigatória com termos e serviços antes de confirmar a inscrição e pagamento **apenas na plataforma de federações**. O usuário deve ler todo o documento (rolando até o final) e aceitar explicitamente para prosseguir.

---

## Arquivos Criados

### 1. **Componente Modal** (`src/components/federation/TermsAndConditionsModal.tsx`)
- Componente React reutilizável que exibe o modal de termos
- **Funcionalidades:**
  - Apresenta os 8 termos conforme especificado (Objeto, Investimento, Regra de Graduação, Formas de Pagamento, Desistência, Inatividade, Uso de Imagem, Dados Pessoais)
  - Obriga o usuário a **rolar até o final** do documento antes de habilitar o checkbox
  - Link clicável para PDF completo do contrato (`/documents/contrato-profef-lrsj.pdf`)
  - Design responsivo com animações suaves
  - Cores dinâmicas baseadas na federação

### 2. **Documento PDF** (`public/documents/contrato-profef-lrsj.pdf`)
- PDF original do contrato copiado para a pasta pública
- Acessível via link no modal e no botão "Contrato Completo (PDF)"

---

## Mudanças Realizadas

### 3. **Portal do Candidato** (`src/app/federation/[slug]/candidato/page.tsx`)

#### Imports Adicionados:
```tsx
import TermsAndConditionsModal from '../../../../components/federation/TermsAndConditionsModal';
```

#### Estados Adicionados:
```tsx
// --- ESTADO DO MODAL DE TERMOS ---
const [showTermsModal, setShowTermsModal] = useState(false);
const [termsAccepted, setTermsAccepted] = useState(false);
const [pendingPaymentAfterTerms, setPendingPaymentAfterTerms] = useState(false);
```

#### Lógica do Checkout Modificada:
- **Função `handlePayment()`**: Agora verifica se `termsAccepted === true` no início
  - Se o usuário ainda não aceitou os termos, o modal é exibido automaticamente
  - O pagamento é bloqueado até aceitar os termos
  
#### Novo Handler:
```tsx
const handleAcceptTerms = () => {
  setTermsAccepted(true);
  setShowTermsModal(false);
  if (pendingPaymentAfterTerms) {
    setPendingPaymentAfterTerms(false);
    // Retoma o fluxo de pagamento automaticamente
    setTimeout(() => handlePayment(), 200);
  }
};
```

#### Modal no JSX:
```tsx
<TermsAndConditionsModal
  isOpen={showTermsModal}
  onAccept={handleAcceptTerms}
  onDismiss={() => {
    setShowTermsModal(false);
    setPendingPaymentAfterTerms(false);
  }}
  federationName={federationDisplayName}
  primaryColor={primaryColor}
/>
```

---

## Fluxo de Funcionamento

1. **Usuário clica em "Realizar Inscrição"**
   - Vai para a aba "Inscrição" (financeiro)

2. **Preenche dados de cobrança e endereço**
   - Seleciona método de pagamento (PIX, Cartão, Boleto)

3. **Clica no botão de pagamento**
   - Sistema verifica: `if (!termsAccepted)`
   
4. **Se NÃO aceitou os termos:**
   - Modal é exibido com os termos de adesão
   - Usuário precisa rolar até o final do documento
   - Checkbox fica desabilitado até rolar completamente
   - Ao aceitar, o modal fecha e o pagamento prossegue automaticamente

5. **Se JÁ aceitou os termos:**
   - Pagamento prossegue normalmente (PIX, Cartão ou Boleto)

---

## Conteúdo dos Termos Exibidos

O modal apresenta os seguintes tópicos com ícones visuais:

1. **Objeto**: Capacitação técnica para outorga de graduação (12-24 meses)
2. **Investimento Total**: R$ 2.200,00 como dívida líquida no ato da matrícula
3. **Regra de Graduação**: Quitação integral obrigatória antes do certificado
4. **Formas de Pagamento**: À vista ou parcelado em 5x, 10x ou 20x
5. **Desistência e Rescisão**: Multa de 20% sobre saldo devedor em caso de resgate
6. **Inatividade**: Não gera cancelamento automático (acima de 90 dias)
7. **Uso de Imagem**: Autoriza uso em materiais institucionais
8. **Dados Pessoais**: Tratamento conforme LGPD

**Link para Contrato Completo**: Botão clicável que abre o PDF em nova aba

---

## Especificidades Técnicas

- ✅ **Somente em Federações**: O modal está integrado no portal de candidatos das federações (`/federation/[slug]/candidato`)
- ✅ **Obrigatório**: Bloqueia prosseguimento sem aceitar
- ✅ **UX Melhorada**: Requer scroll até o final para garantir leitura
- ✅ **Dinâmico**: Cores adaptam-se conforme configuração da federação
- ✅ **Responsivo**: Funciona bem em mobile e desktop
- ✅ **Acessível**: Checkbox com label clara e indicações visuais

---

## Testando

### Para Testar o Fluxo:

1. Acesse `/federation/lrsj/candidato` (ou sua federação)
2. Vá para a aba **Inscrição**
3. Preencha os dados (CPF, Telefone, Endereço)
4. Selecione um método de pagamento
5. Clique em **Confirmar Inscrição/Pagamento**
6. O modal de termos deve aparecer automaticamente
7. Role até o final do documento
8. Marque o checkbox
9. Clique em **Confirmar Adesão**
10. O sistema processará o pagamento

---

## Notas Importantes

- O estado `termsAccepted` persiste apenas durante a sessão do usuário (não é salvo no banco)
- Se o usuário fechar o modal sem aceitar, precisa clicar novamente no botão de pagamento
- O PDF está armazenado em `public/documents/contrato-profef-lrsj.pdf` e é servido estaticamente
- A implementação usa o nome da federação dinamicamente (vem de `federationDisplayName`)
- A cor primária do modal segue a paleta da federação (vem de `primaryColor`)

