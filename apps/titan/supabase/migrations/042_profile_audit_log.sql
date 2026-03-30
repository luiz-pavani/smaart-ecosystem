-- Audit log for profile changes
CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id     uuid NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  actor_id      uuid NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  actor_nome    text,
  action        text NOT NULL, -- e.g. 'update_fed', 'update_stakeholder', 'update_password', 'update_role'
  fields        text[], -- fields changed
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookup by target
CREATE INDEX IF NOT EXISTS profile_audit_log_target_idx ON public.profile_audit_log(target_id, created_at DESC);

-- RLS: authenticated users can read logs for their own profile; master/federacao can read any
ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own audit log" ON public.profile_audit_log
  FOR SELECT USING (auth.uid() = target_id);

CREATE POLICY "master and federacao read any audit log" ON public.profile_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stakeholders
      WHERE id = auth.uid()
      AND role IN ('master_access', 'federacao_admin')
    )
  );

-- Only service_role can insert (API routes use supabaseAdmin)
CREATE POLICY "service_role insert" ON public.profile_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
