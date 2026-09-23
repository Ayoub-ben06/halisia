-- Latest AAOIFI screening per ticker, shared by all users and refreshed by the
-- /api/process-notifications cron. Status changes are detected against it.
CREATE TABLE IF NOT EXISTS public.screening_cache (
  ticker text PRIMARY KEY,
  status text NOT NULL,
  previous_status text,
  purification_ratio numeric,
  reason text,
  error text,
  screened_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.screening_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read screenings" ON public.screening_cache;
CREATE POLICY "Authenticated users can read screenings"
  ON public.screening_cache FOR SELECT TO authenticated
  USING (true);

-- 90-day rule: 30 days to wait for a return to compliance, then 60 days to sell.
CREATE TABLE IF NOT EXISTS public.compliance_changes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  isin text,
  name text,
  previous_status text,
  new_status text,
  change_date timestamptz DEFAULT now(),
  day_30_deadline timestamptz,
  day_90_deadline timestamptz,
  resolved boolean DEFAULT false,
  resolution text CHECK (resolution IN ('sold', 'restored_compliant', 'purified')),
  resolved_at timestamptz,
  notified_at timestamptz,
  reminder_30_sent_at timestamptz,
  reminder_85_sent_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS compliance_changes_open_unique_idx
  ON public.compliance_changes (user_id, ticker)
  WHERE NOT resolved;

CREATE INDEX IF NOT EXISTS compliance_changes_open_idx
  ON public.compliance_changes (day_30_deadline)
  WHERE NOT resolved;

ALTER TABLE public.compliance_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own compliance changes" ON public.compliance_changes;
CREATE POLICY "Users can read their own compliance changes"
  ON public.compliance_changes FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
