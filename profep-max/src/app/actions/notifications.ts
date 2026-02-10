"use server";

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDossierNotification(
  email: string, 
  atletaNome: string, 
  status: string, 
  entidadeNome: string,
  feedback?: string
) {
  const isApproved = status === 'Aprovado';
  const subject = isApproved 
    ? `✅ Dossiê Aprovado - ${entidadeNome}` 
    : `⚠️ Pendência no Dossiê - ${entidadeNome}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #059669; padding: 20px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 20px; text-transform: uppercase;">${entidadeNome}</h1>
      </div>
      <div style="padding: 30px; color: #333; line-height: 1.6;">
        <p>Olá, <strong>Sensei ${atletaNome}</strong>,</p>
        <p>Houve uma atualização no status da sua inscrição para o Exame de Graduação 2026.</p>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid ${isApproved ? '#059669' : '#dc2626'}; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; text-transform: uppercase; font-size: 12px; color: #666;">Novo Status:</p>
          <p style="margin: 5px 0 0 0; font-size: 18px; color: ${isApproved ? '#059669' : '#dc2626'}; font-weight: 900;">${status.toUpperCase()}</p>
          ${feedback ? `<p style="margin-top: 15px; font-size: 13px; color: #444;"><strong>Motivo:</strong> ${feedback}</p>` : ''}
        </div>

        <p>Acesse seu portal para conferir os detalhes e próximos passos.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://profepmax.com.br" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">ACESSAR PORTAL DO CANDIDATO</a>
        </div>
      </div>
      <footer style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 10px; color: #999;">
        Este é um e-mail automático enviado pelo sistema de gestão da ${entidadeNome}.
      </footer>
    </div>
  `;

  try {
    console.log(`[Email] Enviando para ${email}: ${subject}`);
    
    await resend.emails.send({
      from: `${entidadeNome} <judo@profepmax.com.br>`,
      to: email,
      subject: subject,
      html: html,
    });

    return { success: true };
  } catch (error) {
    console.error('[Email Error]:', error);
    return { success: false, error };
  }
}