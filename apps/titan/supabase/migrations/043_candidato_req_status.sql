-- Add observacoes to candidato_inscricoes
ALTER TABLE public.candidato_inscricoes
  ADD COLUMN IF NOT EXISTS observacoes text;

-- Table to track per-requirement completion status
CREATE TABLE IF NOT EXISTS public.candidato_req_status (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id  uuid NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  req_key         text NOT NULL, -- e.g. "shodan.presential.0"
  user_completed  boolean NOT NULL DEFAULT false,
  admin_confirmed boolean NOT NULL DEFAULT false,
  admin_nota      text,
  admin_id        uuid REFERENCES public.stakeholders(id),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stakeholder_id, req_key)
);

CREATE INDEX IF NOT EXISTS candidato_req_status_stakeholder_idx
  ON public.candidato_req_status(stakeholder_id);

ALTER TABLE public.candidato_req_status ENABLE ROW LEVEL SECURITY;

-- Candidate reads own status
CREATE POLICY "candidate reads own req status" ON public.candidato_req_status
  FOR SELECT USING (auth.uid() = stakeholder_id);

-- Admins/federacao read any
CREATE POLICY "admin reads any req status" ON public.candidato_req_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stakeholders
      WHERE id = auth.uid()
      AND role IN ('master_access', 'federacao_admin')
    )
  );

-- Service role manages everything
CREATE POLICY "service_role all" ON public.candidato_req_status
  FOR ALL USING (auth.role() = 'service_role');
