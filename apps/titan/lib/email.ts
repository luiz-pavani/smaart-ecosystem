import { Resend } from 'resend'

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

/**
 * Envia email via Resend. Retorna boolean indicando sucesso.
 * Não joga exception — falha de email não deve quebrar fluxo principal
 * (filiação, cadastro etc.). Apenas loga.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY ou EMAIL_FROM ausente — pulando envio')
    return false
  }
  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    })
    return true
  } catch (err) {
    console.error('[email] erro no envio Resend:', err)
    return false
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'

const baseLayout = (title: string, body: string) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,system-ui,Segoe UI,Roboto,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <tr>
              <td style="background:#dc2626;padding:20px 24px;">
                <strong style="color:#fff;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;">Titan</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h1>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                Este é um email automático do Titan. Em caso de dúvida, responda à sua federação.<br/>
                <a href="${BASE_URL}" style="color:#dc2626;text-decoration:none;">${BASE_URL.replace(/^https?:\/\//, '')}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

interface ConfirmacaoPagamentoParams {
  nome: string
  descricao: string
  valor: number
  email: string
  dataPagamento?: string
}

/** Email de confirmação de pagamento (filiação, evento, anuidade). */
export async function emailConfirmacaoPagamento(p: ConfirmacaoPagamentoParams) {
  const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)
  const data = p.dataPagamento || new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      Olá <strong>${escapeHtml(p.nome)}</strong>, recebemos seu pagamento. ✅
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Descrição</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#111827;">${escapeHtml(p.descricao)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Valor</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#111827;">${valorFmt}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Data</td><td style="padding:6px 0;text-align:right;color:#374151;">${data}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#374151;">
      Você pode consultar o histórico completo no
      <a href="${BASE_URL}/portal/atleta/financeiro" style="color:#dc2626;font-weight:600;">portal financeiro</a>.
    </p>
  `
  return sendEmail({
    to: p.email,
    subject: `Pagamento confirmado — ${p.descricao}`,
    html: baseLayout('Pagamento confirmado', body),
  })
}

interface ResetSenhaParams {
  email: string
  nome?: string
  linkRecuperacao: string
}

/** Email com link de recuperação de senha. */
export async function emailResetSenha(p: ResetSenhaParams) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      Olá${p.nome ? ' <strong>' + escapeHtml(p.nome) + '</strong>' : ''}, recebemos um pedido de redefinição de senha para sua conta no Titan.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;">
      Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
    </p>
    <p style="margin:24px 0;">
      <a href="${escapeAttr(p.linkRecuperacao)}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Redefinir minha senha
      </a>
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
      Se você não solicitou essa alteração, ignore este email — sua senha continua a mesma.
    </p>
  `
  return sendEmail({
    to: p.email,
    subject: 'Redefinição de senha — Titan',
    html: baseLayout('Redefinir senha', body),
  })
}

// ── helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  )
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
