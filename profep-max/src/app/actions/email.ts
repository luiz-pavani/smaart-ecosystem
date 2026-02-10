"use server";

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envia email de confirmação de pagamento para candidatos de federação
 */
export async function sendFederationPaymentConfirmation(
  email: string,
  name: string,
  entityName: string,
  amount: number,
  graduacao: string
) {
  const subject = `✅ Inscrição Confirmada - ${entityName}`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">🥋 ${entityName}</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Programa de Graduação 2026</p>
      </div>
      
      <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
        <p style="font-size: 18px; margin: 0 0 20px 0;">Olá, <strong>Sensei ${name}</strong>,</p>
        
        <p style="font-size: 16px; color: #555;">Seu pagamento foi confirmado com sucesso! Sua inscrição para o exame de <strong>${graduacao}</strong> está oficialmente ativa.</p>
        
        <div style="background: #F0FDF4; padding: 25px; border-radius: 12px; border-left: 4px solid #10B981; margin: 30px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #059669;">Valor Pago</span>
            <span style="font-size: 24px; font-weight: 900; color: #059669;">R$ ${amount.toFixed(2)}</span>
          </div>
          <div style="border-top: 1px solid #A7F3D0; padding-top: 15px;">
            <p style="margin: 0; font-size: 14px; color: #047857;">✓ Acesso à Área de Estudo liberado</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #047857;">✓ Cronograma oficial disponível</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #047857;">✓ Documentos podem ser enviados</p>
          </div>
        </div>

        <p style="font-size: 15px; color: #555;">Acesse agora seu portal do candidato para visualizar os próximos passos, enviar documentos e acompanhar o cronograma de atividades.</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.profepmax.com.br/federation/${entityName.toLowerCase().replace(/\s+/g, '-')}/candidato" 
             style="background-color: #DC2626; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block; letter-spacing: 1px;">
            ACESSAR MEU PORTAL
          </a>
        </div>

        <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B; margin-top: 30px;">
          <p style="margin: 0; font-size: 13px; color: #92400E;">
            <strong>⚠️ Importante:</strong> Complete seu cadastro e envie toda a documentação obrigatória o quanto antes. A análise do dossiê pode levar até 7 dias úteis.
          </p>
        </div>
      </div>
      
      <footer style="background-color: #111827; padding: 25px; text-align: center; color: #9CA3AF;">
        <p style="margin: 0 0 10px 0; font-size: 12px;">Este é um email automático do sistema de gestão</p>
        <p style="margin: 0; font-size: 11px; opacity: 0.7;">PROFEP MAX © 2026 - Excelência na formação de Faixas Pretas</p>
      </footer>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'PROFEP MAX <judo@profepmax.com.br>',
      to: email,
      subject: subject,
      html: html,
    });
    console.log(`[Email] Confirmação enviada para ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Error]:', error);
    return { success: false, error };
  }
}

/**
 * Envia email de confirmação de pagamento do Profep MAX
 */
export async function sendProfepPaymentConfirmation(
  email: string,
  name: string,
  plan: string,
  amount: number
) {
  const planNames: any = {
    'mensal': 'Mensal',
    'anual': 'Anual',
    'vitalicio': 'Vitalício'
  };

  const subject = `✅ Bem-vindo ao PROFEP MAX, Sensei!`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #333;">
      <div style="background: linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%); padding: 50px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; font-style: italic; letter-spacing: 3px;">PROFEP MAX</h1>
        <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 2px;">Da Kodokan ao Alto Rendimento</p>
      </div>
      
      <div style="padding: 40px 30px; line-height: 1.8;">
        <p style="font-size: 20px; margin: 0 0 20px 0; color: #DC2626; font-weight: 900;">OSS, SENSEI ${name.toUpperCase()}!</p>
        
        <p style="font-size: 16px; color: #ccc;">Sua jornada rumo à maestria começou. Você agora tem acesso total à plataforma de formação mais completa do judô brasileiro.</p>
        
        <div style="background: #1A1A1A; padding: 25px; border-radius: 12px; border: 1px solid #333; margin: 30px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px solid #333;">
            <span style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #999;">Plano Ativo</span>
            <span style="font-size: 20px; font-weight: 900; color: #DC2626;">${planNames[plan] || plan}</span>
          </div>
          <div style="padding-top: 15px;">
            <p style="margin: 0; font-size: 14px; color: #10B981;">✓ Todos os cursos liberados</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #10B981;">✓ Certificados oficiais</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #10B981;">✓ Suporte prioritário</p>
          </div>
        </div>

        <p style="font-size: 15px; color: #ccc;">Comece agora explorando nosso catálogo de formações. Da história do judô às técnicas de alto rendimento, tudo está ao seu alcance.</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.profepmax.com.br/cursos" 
             style="background-color: #DC2626; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block; letter-spacing: 1px;">
            ACESSAR MEUS CURSOS
          </a>
        </div>
      </div>
      
      <footer style="background-color: #0A0A0A; padding: 25px; text-align: center; border-top: 1px solid #222;">
        <p style="margin: 0 0 10px 0; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Onde a tradição encontra a inovação</p>
        <p style="margin: 0; font-size: 10px; color: #444;">PROFEP MAX © 2026</p>
      </footer>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'PROFEP MAX <judo@profepmax.com.br>',
      to: email,
      subject: subject,
      html: html,
    });
    console.log(`[Email] Confirmação Profep enviada para ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Error]:', error);
    return { success: false, error };
  }
}
