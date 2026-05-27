export const metadata = {
  title: 'Termos de Uso · Titan',
  description: 'Termos de Uso da plataforma Titan.',
}

export default function TermosDeUsoPage() {
  return (
    <article className="prose prose-sm max-w-3xl mx-auto py-10 px-6 prose-headings:font-semibold">
      <h1>Termos de Uso</h1>
      <p className="text-sm text-gray-500">Última atualização: 27 de maio de 2026.</p>

      <h2>1. Aceitação dos Termos</h2>
      <p>
        Ao criar uma conta e utilizar a plataforma <strong>Titan</strong>{' '}
        (titan.smaartpro.com), você declara ter lido, entendido e aceito os
        presentes Termos de Uso e a{' '}
        <a href="/privacidade">Política de Privacidade</a>. Se você não
        concorda com qualquer item, não utilize a plataforma.
      </p>

      <h2>2. Descrição do Serviço</h2>
      <p>
        O Titan é uma plataforma de gestão para entidades esportivas (federações,
        academias e atletas) com funcionalidades de filiação, inscrição em
        eventos, emissão de carteirinhas/identidades esportivas, gestão de
        graduações, processamento de pagamentos via gateway externo (Safe2Pay)
        e comunicação por WhatsApp/email.
      </p>

      <h2>3. Conta de Usuário</h2>
      <ul>
        <li>Você é responsável pela veracidade dos dados informados.</li>
        <li>
          Mantenha sua senha confidencial. Atividades realizadas com suas
          credenciais são de sua responsabilidade.
        </li>
        <li>
          A entidade pode suspender ou encerrar contas que violem estes
          Termos, a legislação aplicável ou os regulamentos da federação.
        </li>
      </ul>

      <h2>4. Pagamentos e Reembolsos</h2>
      <ul>
        <li>
          Pagamentos de filiação, inscrição em eventos e demais cobranças são
          processados pelo Safe2Pay. O Titan não armazena dados de cartão.
        </li>
        <li>
          Taxas de inscrição em eventos não são reembolsáveis após o
          encerramento do prazo de inscrição, salvo cancelamento do próprio
          evento pela organização.
        </li>
        <li>
          Anuidades pagas e não utilizadas integralmente (por exemplo, em caso
          de pedido voluntário de desligamento) não são reembolsadas.
        </li>
      </ul>

      <h2>5. Conduta do Usuário</h2>
      <p>É proibido:</p>
      <ul>
        <li>Usar a plataforma para fins ilegais ou que violem direitos de terceiros;</li>
        <li>Tentar burlar mecanismos de segurança ou acessar dados de outros usuários;</li>
        <li>Inserir dados falsos, especialmente em graduações, vínculos a academias e documentos;</li>
        <li>Realizar uso automatizado (scraping, bots) sem autorização escrita.</li>
      </ul>

      <h2>6. Propriedade Intelectual</h2>
      <p>
        O software, o design, marcas e conteúdos próprios da plataforma são de
        titularidade do SMAART/Titan. Logos de academias e federações
        permanecem propriedade de suas respectivas entidades.
      </p>

      <h2>7. Limitação de Responsabilidade</h2>
      <p>
        O Titan é fornecido &quot;como está&quot;. Embora façamos todo esforço para
        manter o serviço disponível e seguro, não respondemos por:
      </p>
      <ul>
        <li>Indisponibilidades pontuais de infraestrutura (Vercel, Supabase, Safe2Pay, Meta WhatsApp);</li>
        <li>Decisões da federação sobre filiação, graduação, sanções esportivas;</li>
        <li>Atrasos no processamento de pagamentos pelo gateway externo;</li>
        <li>Uso indevido por terceiros que tenham obtido suas credenciais.</li>
      </ul>

      <h2>8. Alterações nos Termos</h2>
      <p>
        Estes Termos podem ser atualizados a qualquer momento. Você será
        notificado por email ou no próprio sistema sobre alterações
        substanciais. O uso continuado da plataforma após a alteração
        constitui aceite da nova versão.
      </p>

      <h2>9. Lei e Foro</h2>
      <p>
        Aplica-se a legislação brasileira. Fica eleito o foro da comarca de
        Porto Alegre/RS para dirimir quaisquer questões oriundas destes
        Termos, com renúncia a qualquer outro, por mais privilegiado que seja.
      </p>

      <h2>10. Contato</h2>
      <p>
        Para dúvidas, entre em contato pelo email indicado no rodapé do site
        ou pela federação à qual você é filiado.
      </p>
    </article>
  )
}
