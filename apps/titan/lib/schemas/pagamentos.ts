// lib/schemas/pagamentos.ts - SPRINT 1A
// COPIE E COLE TUDO ISTO:

import { z } from 'zod'

export const CriarPagamentoSchema = z.object({
  academia_id: z.string().uuid('Academia ID inválido'),
  atleta_id: z.string().uuid('Atleta ID inválido'),
  valor: z.number().positive('Valor deve ser positivo'),
  descricao: z.string().optional().default('Mensalidade Academia'),
  metodo_pagamento: z.enum(['boleto', 'pix', 'credito']).default('pix'),
  data_vencimento: z.string().date('Data inválida'),
})

export type CriarPagamento = z.infer<typeof CriarPagamentoSchema>

export const PedidoSchema = z.object({
  id: z.string().uuid(),
  academia_id: z.string().uuid(),
  atleta_id: z.string().uuid(),
  valor: z.number(),
  status: z.enum(['pendente', 'processando', 'aprovado', 'recusado', 'cancelado']),
  metodo_pagamento: z.string().nullable(),
  safe2pay_reference: z.string().nullable(),
  safe2pay_transaction_id: z.string().nullable(),
  data_vencimento: z.string().date().nullable(),
  data_pagamento: z.string().datetime().nullable(),
  mes_ref: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Pedido = z.infer<typeof PedidoSchema>

