'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSubscriptionCreatedEmail(
  email: string,
  fullName: string,
  plan: string,
  amount: number,
  subscriptionId: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'PROFEP MAX <judo@profepmax.com.br>',
      to: email,
      subject: `✅ Assinatura Confirmada`,
      html: `<p>Olá ${fullName}, sua assinatura foi confirmada!</p>`,
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

export async function sendSubscriptionRenewalEmail(
  email: string,
  fullName: string,
  plan: string,
  amount: number
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'PROFEP MAX <judo@profepmax.com.br>',
      to: email,
      subject: `🔄 Assinatura Renovada`,
      html: `<p>Olá ${fullName}, sua assinatura foi renovada!</p>`,
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

export async function sendSubscriptionFailureEmail(
  email: string,
  fullName: string,
  failureReason: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'PROFEP MAX <judo@profepmax.com.br>',
      to: email,
      subject: `⚠️ Problema na Renovação`,
      html: `<p>Olá ${fullName}, houve um problema na renovação. Motivo: ${failureReason}</p>`,
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

export async function sendSubscriptionCanceledEmail(
  email: string,
  fullName: string,
  plan: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'PROFEP MAX <judo@profepmax.com.br>',
      to: email,
      subject: `👋 Assinatura Cancelada`,
      html: `<p>Olá ${fullName}, sua assinatura foi cancelada.</p>`,
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

export async function sendSubscriptionExpiredEmail(
  email: string,
  fullName: string,
  plan: string,
  newPrice?: number
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'PROFEP MAX <judo@profepmax.com.br>',
      to: email,
      subject: `⏰ Assinatura Expirada`,
      html: `<p>Olá ${fullName}, sua assinatura expirou. Considere renova-la!</p>`,
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}
