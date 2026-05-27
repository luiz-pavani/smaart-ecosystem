export const metadata = {
  title: 'Política de Privacidade · Titan',
  description: 'Política de Privacidade e tratamento de dados pessoais conforme LGPD.',
}

export default function PoliticaPrivacidadePage() {
  return (
    <article className="prose prose-sm max-w-3xl mx-auto py-10 px-6 prose-headings:font-semibold">
      <h1>Política de Privacidade</h1>
      <p className="text-sm text-gray-500">
        Última atualização: 27 de maio de 2026. Em conformidade com a Lei Geral
        de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <h2>1. Quem é o controlador dos dados</h2>
      <p>
        A federação à qual você se vincula (por exemplo, Liga Riograndense de
        Judô — LRSJ) é a <strong>controladora</strong> dos seus dados pessoais.
        O Titan (SMAART) atua como <strong>operador</strong>, processando os
        dados em nome da federação conforme as instruções dela.
      </p>

      <h2>2. Quais dados coletamos</h2>
      <ul>
        <li>
          <strong>Cadastrais:</strong> nome completo, e-mail, telefone/WhatsApp,
          data de nascimento, CPF (quando informado), endereço, gênero,
          academia e graduação atual.
        </li>
        <li>
          <strong>Documentais:</strong> foto de perfil, RG ou certidão de
          nascimento (para emissão de carteirinha), certificados de DAN.
        </li>
        <li>
          <strong>Esportivos:</strong> histórico de graduações, inscrições e
          resultados em eventos, vínculos com academias.
        </li>
        <li>
          <strong>Financeiros:</strong> histórico de pagamentos (não
          armazenamos dados de cartão — apenas a referência transacional
          retornada pelo Safe2Pay).
        </li>
        <li>
          <strong>Técnicos:</strong> IP, tipo de dispositivo, logs de acesso
          (para fins de segurança e auditoria).
        </li>
      </ul>

      <h2>3. Base legal e finalidades (Art. 7º LGPD)</h2>
      <ul>
        <li>
          <strong>Execução de contrato</strong> (filiação à federação): cadastro,
          carteirinha, inscrição em eventos, gestão de anuidade.
        </li>
        <li>
          <strong>Cumprimento de obrigação legal/regulatória</strong>: emissão
          de comprovantes fiscais, atendimento à Lei Geral do Esporte.
        </li>
        <li>
          <strong>Consentimento</strong>: comunicações de marketing,
          divulgação de resultados em rankings públicos.
        </li>
        <li>
          <strong>Legítimo interesse</strong>: prevenção a fraude, segurança da
          informação.
        </li>
      </ul>

      <h2>4. Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>Federação</strong> a que você é filiado (LRSJ, etc.) e sua{' '}
          <strong>academia</strong> indicada;
        </li>
        <li>
          <strong>Safe2Pay</strong> (processamento de pagamentos);
        </li>
        <li>
          <strong>Meta WhatsApp Business</strong> (envio de mensagens de
          notificação);
        </li>
        <li>
          <strong>Resend</strong> (envio de e-mails transacionais);
        </li>
        <li>
          <strong>Supabase e Vercel</strong> (infraestrutura de hospedagem e
          banco de dados);
        </li>
        <li>
          <strong>Profep MAX</strong> (apenas para candidatos ao Programa de
          Formação de Faixas Pretas, via SSO).
        </li>
      </ul>
      <p>
        Não vendemos dados pessoais. Não compartilhamos com terceiros para
        marketing sem o seu consentimento explícito.
      </p>

      <h2>5. Dados públicos (registro de graduações)</h2>
      <p>
        Para verificação por terceiros (organizadores de evento,
        instituições de ensino, arbitragem), publicamos em uma página
        pública (titan.smaartpro.com/lrsj/graduacoes) o seguinte conjunto
        reduzido: <strong>nome completo, academia, graduação e status da
        anuidade</strong>. Dados sensíveis (CPF, telefone, endereço) nunca
        são publicados.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li>
          Dados de filiação: enquanto durar o vínculo + 5 anos para histórico
          esportivo e fins legais.
        </li>
        <li>
          Logs técnicos: 90 dias.
        </li>
        <li>
          Documentos digitalizados: enquanto a graduação for válida no sistema
          desportivo nacional.
        </li>
      </ul>

      <h2>7. Seus direitos (Art. 18 LGPD)</h2>
      <p>Você pode, a qualquer momento, solicitar:</p>
      <ul>
        <li>Confirmação da existência de tratamento;</li>
        <li>Acesso aos seus dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Portabilidade;</li>
        <li>Eliminação dos dados tratados com base no consentimento;</li>
        <li>Revogação do consentimento.</li>
      </ul>
      <p>
        Para exercer esses direitos, entre em contato com a sua federação
        (controladora) ou com o suporte do Titan.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Aplicamos criptografia em trânsito (HTTPS), segregação de dados por
        federação, autenticação multifator quando suportada, políticas de
        acesso baseadas em função (RBAC) e auditoria contínua de
        vulnerabilidades.
      </p>

      <h2>9. Crianças e adolescentes</h2>
      <p>
        Atletas menores de idade devem ter seu cadastro autorizado pelos
        responsáveis legais. A federação é responsável por validar essa
        autorização.
      </p>

      <h2>10. Alterações nesta Política</h2>
      <p>
        Esta Política pode ser atualizada. Mudanças relevantes serão
        comunicadas com pelo menos 15 dias de antecedência.
      </p>

      <h2>11. Contato e Encarregado (DPO)</h2>
      <p>
        Solicitações relacionadas a dados pessoais devem ser enviadas à
        federação à qual você se vincula (controladora) ou ao operador
        Titan/SMAART pelo email de contato indicado no rodapé.
      </p>
    </article>
  )
}
