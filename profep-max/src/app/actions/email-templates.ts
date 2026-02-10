"use server";

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'PROFEP MAX <judo@profepmax.com.br>';

/**
 * 1. EMAIL DE BOAS-VINDAS (já existente, mas melhorado)
 * Trigger: Novo cadastro na plataforma
 */
export async function sendWelcomeEmail(email: string, name: string) {
  const subject = '🥋 Bem-vindo ao PROFEP MAX, Sensei!';
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #333;">
      <div style="background: linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%); padding: 50px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; font-style: italic; letter-spacing: 3px;">PROFEP MAX</h1>
        <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 2px;">Da Kodokan ao Alto Rendimento</p>
      </div>
      
      <div style="padding: 40px 30px; line-height: 1.8;">
        <p style="font-size: 20px; margin: 0 0 20px 0; color: #DC2626; font-weight: 900;">OSS, SENSEI ${name.toUpperCase()}!</p>
        
        <p style="font-size: 16px; color: #ccc;">Sua conta foi criada com sucesso. Você agora faz parte da maior plataforma de formação para professores e faixas pretas do judô brasileiro.</p>
        
        <div style="background: #1A1A1A; padding: 25px; border-radius: 12px; border: 1px solid #333; margin: 30px 0;">
          <h3 style="margin: 0 0 15px 0; color: #DC2626; font-size: 18px;">Próximos Passos:</h3>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #10B981;">✓ Complete seu perfil</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #10B981;">✓ Explore nossos cursos</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #10B981;">✓ Conecte-se com outros senseis</p>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.profepmax.com.br/cursos" 
             style="background-color: #DC2626; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block; letter-spacing: 1px;">
            COMEÇAR AGORA
          </a>
        </div>
      </div>
      
      <footer style="background-color: #0A0A0A; padding: 25px; text-align: center; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 10px; color: #444;">PROFEP MAX © 2026</p>
      </footer>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
    console.log(`[Email] Boas-vindas enviado para ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Error]:', error);
    return { success: false, error };
  }
}

/**
 * 2. LEMBRETE DE DOCUMENTOS PENDENTES
 * Trigger: 3 dias após pagamento sem upload de documentos obrigatórios
 */
export async function sendDocumentReminderEmail(
  email: string,
  name: string,
  entityName: string,
  missingDocs: string[]
) {
  const subject = `⚠️ Documentos Pendentes - ${entityName}`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 900;">⚠️ Ação Necessária</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${entityName}</p>
      </div>
      
      <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
        <p style="font-size: 18px;">Olá, <strong>Sensei ${name}</strong>,</p>
        
        <p>Sua inscrição foi confirmada, mas ainda faltam documentos obrigatórios para concluir seu dossiê:</p>
        
        <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #92400E;">Documentos Pendentes:</h3>
          ${missingDocs.map(doc => `<p style="margin: 5px 0; color: #92400E;">• ${doc}</p>`).join('')}
        </div>

        <p><strong>Importante:</strong> A análise do seu dossiê só será iniciada após o envio completo de todos os documentos.</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.profepmax.com.br/federation/${entityName.toLowerCase().replace(/\s+/g, '-')}/candidato" 
             style="background-color: #F59E0B; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block;">
            ENVIAR DOCUMENTOS
          </a>
        </div>
      </div>
      
      <footer style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 11px; color: #999;">
        ${entityName} © 2026
      </footer>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
    console.log(`[Email] Lembrete documentos enviado para ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Error]:', error);
    return { success: false, error };
  }
}

/**
 * 3. CERTIFICADO DISPONÍVEL
 * Trigger: Candidato aprovado no exame
 */
export async function sendCertificateAvailableEmail(
  email: string,
  name: string,
  entityName: string,
  graduacao: string,
  certificateId: string
) {
  const subject = `🎖️ Certificado Disponível - ${graduacao}`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px; text-align: center; color: white;">
        <div style="font-size: 60px; margin-bottom: 10px;">🎖️</div>
        <h1 style="margin: 0; font-size: 28px; font-weight: 900;">PARABÉNS!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Você foi aprovado</p>
      </div>
      
      <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
        <p style="font-size: 18px;">Olá, <strong>Sensei ${name}</strong>,</p>
        
        <p style="font-size: 16px;">É com grande satisfação que informamos que você foi <strong>APROVADO</strong> no exame de graduação para <strong style="color: #059669;">${graduacao}</strong>!</p>
        
        <div style="background: #F0FDF4; padding: 25px; border-radius: 12px; border-left: 4px solid #10B981; margin: 30px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #047857; text-transform: uppercase; font-weight: bold;">Seu Certificado Está Disponível</p>
          <p style="margin: 15px 0 0 0; font-size: 32px; font-weight: 900; color: #059669;">${graduacao}</p>
        </div>

        <p>Seu certificado oficial já pode ser baixado e impresso. Utilize o botão abaixo para acessar:</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.profepmax.com.br/certificado/${certificateId}" 
             style="background-color: #10B981; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block;">
            BAIXAR CERTIFICADO
          </a>
        </div>

        <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin-top: 30px; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #92400E; font-style: italic;">
            "A persistência é o caminho do êxito." - Jigoro Kano
          </p>
        </div>
      </div>
      
      <footer style="background-color: #111827; padding: 25px; text-align: center; color: #9CA3AF;">
        <p style="margin: 0 0 10px 0; font-size: 12px;">${entityName}</p>
        <p style="margin: 0; font-size: 11px; opacity: 0.7;">PROFEP MAX © 2026</p>
      </footer>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
    console.log(`[Email] Certificado disponível enviado para ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Error]:', error);
    return { success: false, error };
  }
}

/**
 * 4. LEMBRETE DE EVENTO PRÓXIMO
 * Trigger: 7 dias antes de evento do cronograma
 */
export async function sendEventReminderEmail(
  email: string,
  name: string,
  event: {
    title: string;
    date: string;
    location?: string;
    description?: string;
  }
) {
  const subject = `📅 Lembrete: ${event.title} - Próxima Semana`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 30px; text-align: center; color: white;">
        <div style="font-size: 48px; margin-bottom: 10px;">📅</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 900;">Evento Próximo</h1>
      </div>
      
      <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
        <p style="font-size: 18px;">Olá, <strong>Sensei ${name}</strong>,</p>
        
        <p>Este é um lembrete sobre o evento programado para a próxima semana:</p>
        
        <div style="background: #EFF6FF; padding: 25px; border-radius: 12px; border-left: 4px solid #3B82F6; margin: 30px 0;">
          <h3 style="margin: 0 0 15px 0; color: #1E40AF; font-size: 20px;">${event.title}</h3>
          <p style="margin: 8px 0; color: #1E40AF;"><strong>📅 Data:</strong> ${new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          ${event.location ? `<p style="margin: 8px 0; color: #1E40AF;"><strong>📍 Local:</strong> ${event.location}</p>` : ''}
          ${event.description ? `<p style="margin: 15px 0 0 0; color: #475569;">${event.description}</p>` : ''}
        </div>

        <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; font-size: 13px; color: #92400E; text-align: center;">
            <strong>⚠️ Atenção:</strong> Confirme sua presença e prepare a documentação necessária.
          </p>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.profepmax.com.br/federation/lrsj/candidato" 
             style="background-color: #3B82F6; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block;">
            VER CRONOGRAMA COMPLETO
          </a>
        </div>
      </div>
      
      <footer style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 11px; color: #999;">
        PROFEP MAX © 2026
      </footer>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
    console.log(`[Email] Lembrete evento enviado para ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Error]:', error);
    return { success: false, error };
  }
}

/**
 * 5. RENOVAÇÃO DE PLANO (PROFEP MAX)
 * Trigger: 7 dias antes do vencimento
 */
export async function sendPlanRenewalReminderEmail(
  email: string,
  name: string,
  plan: string,
  expiryDate: string
) {
  const subject = `🔔 Seu plano ${plan} vence em 7 dias`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #333;">
      <div style="background: linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🔔</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 900;">Lembrete de Renovação</h1>
      </div>
      
      <div style="padding: 40px 30px; line-height: 1.8;">
        <p style="font-size: 18px; color: #fff;">Olá, <strong>Sensei ${name}</strong>,</p>
        
        <p style="color: #ccc;">Seu plano <strong style="color: #DC2626;">${plan}</strong> está próximo do vencimento.</p>
        
        <div style="background: #1A1A1A; padding: 25px; border-radius: 12px; border: 1px solid #333; margin: 30px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #999; text-transform: uppercase;">Vencimento em</p>
          <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: 900; color: #DC2626;">${new Date(expiryDate).toLocaleDateString('pt-BR')}</p>
        </div>

        <p style="color: #ccc;">Renove agora e continue com acesso completo a todos os cursos, certificados e conteúdos exclusivos.</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.profepmax.com.br/planos" 
             style="background-color: #DC2626; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block;">
            RENOVAR AGORA
          </a>
        </div>
      </div>
      
      <footer style="background-color: #0A0A0A; padding: 25px; text-align: center; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 10px; color: #444;">PROFEP MAX © 2026</p>
      </footer>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
    console.log(`[Email] Lembrete renovação enviado para ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Error]:', error);
    return { success: false, error };
  }
}

/**
 * 6. PRIMEIRO ACESSO A CURSO
 * Trigger: Primeira vez que aluno entra em um curso
 */
export async function sendFirstCourseAccessEmail(
  email: string,
  name: string,
  courseName: string
) {
  const subject = `🎯 Você começou: ${courseName}`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #333;">
      <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🎯</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 900;">Jornada Iniciada!</h1>
      </div>
      
      <div style="padding: 40px 30px; line-height: 1.8;">
        <p style="font-size: 18px; color: #fff;">Parabéns, <strong>Sensei ${name}</strong>!</p>
        
        <p style="color: #ccc;">Você acabou de iniciar o curso <strong style="color: #8B5CF6;">${courseName}</strong>. Este é o primeiro passo de uma jornada transformadora.</p>
        
        <div style="background: #1A1A1A; padding: 25px; border-radius: 12px; border: 1px solid #333; margin: 30px 0;">
          <h3 style="margin: 0 0 15px 0; color: #8B5CF6;">Dicas para Aproveitar ao Máximo:</h3>
          <p style="margin: 8px 0; color: #10B981;">✓ Assista todas as aulas em ordem</p>
          <p style="margin: 8px 0; color: #10B981;">✓ Faça anotações importantes</p>
          <p style="margin: 8px 0; color: #10B981;">✓ Pratique o que aprendeu</p>
          <p style="margin: 8px 0; color: #10B981;">✓ Revise antes do exame</p>
        </div>

        <p style="color: #ccc;">Lembre-se: A consistência é a chave para a maestria. Continue dedicado!</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.profepmax.com.br/cursos" 
             style="background-color: #8B5CF6; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block;">
            CONTINUAR APRENDENDO
          </a>
        </div>
      </div>
      
      <footer style="background-color: #0A0A0A; padding: 25px; text-align: center; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 10px; color: #444;">PROFEP MAX © 2026</p>
      </footer>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
    console.log(`[Email] Primeiro acesso curso enviado para ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Error]:', error);
    return { success: false, error };
  }
}

/**
 * 7. RANKING SEMANAL (TOP 5)
 * Trigger: Toda sexta-feira às 18h
 */
export async function sendWeeklyRankingEmail(
  email: string,
  name: string,
  userPosition: number,
  userPoints: number,
  top5: Array<{ name: string; points: number; position: number }>
) {
  const subject = `🏆 Ranking Semanal PROFEP MAX - Top 5 Senseis`;
  
  // Medalhas para o pódio
  const getMedal = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}º`;
  };

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #333;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 50px 30px; text-align: center;">
        <div style="font-size: 60px; margin-bottom: 10px;">🏆</div>
        <h1 style="margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Ranking Semanal</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Top 5 Senseis da Semana</p>
      </div>
      
      <div style="padding: 40px 30px; line-height: 1.8;">
        <p style="font-size: 18px; color: #fff;">OSS, <strong>Sensei ${name}</strong>!</p>
        
        <p style="color: #ccc;">Confira os 5 senseis mais dedicados desta semana no PROFEP MAX:</p>
        
        <div style="background: #1A1A1A; padding: 25px; border-radius: 16px; border: 1px solid #333; margin: 30px 0;">
          <h3 style="margin: 0 0 20px 0; color: #F59E0B; font-size: 16px; text-align: center; text-transform: uppercase; letter-spacing: 2px;">🏅 Pódio de Honra 🏅</h3>
          
          ${top5.map((user, index) => `
            <div style="background: ${index === 0 ? 'linear-gradient(135deg, #F59E0B20 0%, #D9770620 100%)' : '#0A0A0A'}; 
                        padding: 15px 20px; 
                        border-radius: 12px; 
                        margin-bottom: 12px; 
                        border: 1px solid ${index === 0 ? '#F59E0B50' : '#222'}; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center;">
              <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 24px; font-weight: 900;">${getMedal(user.position)}</span>
                <span style="font-size: 14px; font-weight: bold; color: ${index === 0 ? '#F59E0B' : '#fff'};">${user.name}</span>
              </div>
              <span style="font-size: 18px; font-weight: 900; color: ${index === 0 ? '#F59E0B' : '#10B981'};">${user.points} pts</span>
            </div>
          `).join('')}
        </div>

        ${userPosition <= 5 ? `
          <div style="background: linear-gradient(135deg, #10B98120 0%, #05966920 100%); padding: 20px; border-radius: 12px; border: 1px solid #10B98150; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 20px; font-weight: 900; color: #10B981;">🎉 PARABÉNS! 🎉</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #fff;">Você está entre os 5 melhores desta semana!</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #10B981; font-weight: bold;">Sua posição: ${getMedal(userPosition)} | ${userPoints} pontos</p>
          </div>
        ` : `
          <div style="background: #1A1A1A; padding: 20px; border-radius: 12px; border: 1px solid #333; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #ccc;">Sua posição atual no ranking:</p>
            <p style="margin: 10px 0 0 0; font-size: 24px; color: #F59E0B; font-weight: 900;">${userPosition}º lugar - ${userPoints} pontos</p>
          </div>
        `}

        <div style="background: #DC262610; padding: 25px; border-radius: 12px; border-left: 4px solid #DC2626; margin: 30px 0;">
          <h3 style="margin: 0 0 15px 0; color: #DC2626; font-size: 16px;">💪 Como Subir no Ranking:</h3>
          <p style="margin: 8px 0; color: #ccc; font-size: 14px;">🎓 Complete mais aulas e cursos</p>
          <p style="margin: 8px 0; color: #ccc; font-size: 14px;">📝 Faça avaliações e exames</p>
          <p style="margin: 8px 0; color: #ccc; font-size: 14px;">🏅 Conquiste novos troféus</p>
          <p style="margin: 8px 0; color: #ccc; font-size: 14px;">⚡ Acesse a plataforma diariamente</p>
        </div>

        <p style="color: #ccc; font-size: 14px; text-align: center; font-style: italic;">
          "O sucesso não é final, o fracasso não é fatal: é a coragem de continuar que conta."
        </p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.profepmax.com.br/ranking" 
             style="background-color: #F59E0B; color: #000; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block; margin-right: 10px;">
            VER RANKING COMPLETO
          </a>
          <a href="https://www.profepmax.com.br/cursos" 
             style="background-color: #DC2626; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block;">
            FAZER UMA AULA
          </a>
        </div>
      </div>
      
      <footer style="background-color: #0A0A0A; padding: 25px; text-align: center; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 10px; color: #444;">PROFEP MAX © 2026</p>
      </footer>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
    console.log(`[Email] Ranking semanal enviado para ${email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email Error]:', error);
    return { success: false, error };
  }
}
