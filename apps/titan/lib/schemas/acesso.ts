// lib/schemas/acesso.ts - SPRINT 1B
// COPIE E COLE TUDO ISTO:

import { z } from 'zod'

export const GerarQRSchema = z.object({
  // GET request - sem body necessário
})

export type GerarQR = z.infer<typeof GerarQRSchema>

export const CheckinSchema = z.object({
  qr_token: z.string().min(20, 'Token QR inválido'),
  academia_id: z.string().uuid('Academia ID inválido'),
  dispositivo: z.enum(['smartphone', 'catraca', 'tablet']).default('smartphone'),
})

export type Checkin = z.infer<typeof CheckinSchema>

export const FrequenciaSchema = z.object({
  id: z.string().uuid(),
  academia_id: z.string().uuid(),
  atleta_id: z.string().uuid(),
  data_entrada: z.string().date(),
  hora_entrada: z.string().time().nullable(),
  hora_saida: z.string().time().nullable(),
  metodo_validacao: z.enum(['qr', 'biometria', 'manual']).default('qr'),
  dispositivo: z.string().nullable(),
  status: z.enum(['ativo', 'autorizado', 'negado', 'manual']).default('ativo'),
  created_at: z.string().datetime(),
})

export type Frequencia = z.infer<typeof FrequenciaSchema>

export const SessaoQRSchema = z.object({
  id: z.string().uuid(),
  atleta_id: z.string().uuid(),
  qr_token: z.string(),
  qr_image_url: z.string().url().nullable(),
  data_criacao: z.string().datetime(),
  data_expiracao: z.string().datetime(),
  usado: z.boolean().default(false),
  data_uso: z.string().datetime().nullable(),
})

export type SessaoQR = z.infer<typeof SessaoQRSchema>

