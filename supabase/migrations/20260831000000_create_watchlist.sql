CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  isin text,
  name text NOT NULL,
  exchange text,
  type text DEFAULT 'stock',
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ticker)
);

CREATE TABLE IF NOT EXISTS public.watchlist_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  name text NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('halal_change', 'price_target')),
  price_target numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON public.watchlist (user_id);
CREATE INDEX IF NOT EXISTS watchlist_alerts_user_id_idx ON public.watchlist_alerts (user_id);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own watchlist" ON public.watchlist;
CREATE POLICY "Users can read their own watchlist"
  ON public.watchlist FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own watchlist" ON public.watchlist;
CREATE POLICY "Users can insert their own watchlist"
  ON public.watchlist FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own watchlist" ON public.watchlist;
CREATE POLICY "Users can delete their own watchlist"
  ON public.watchlist FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read their own watchlist alerts" ON public.watchlist_alerts;
CREATE POLICY "Users can read their own watchlist alerts"
  ON public.watchlist_alerts FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own watchlist alerts" ON public.watchlist_alerts;
CREATE POLICY "Users can insert their own watchlist alerts"
  ON public.watchlist_alerts FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own watchlist alerts" ON public.watchlist_alerts;
CREATE POLICY "Users can update their own watchlist alerts"
  ON public.watchlist_alerts FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own watchlist alerts" ON public.watchlist_alerts;
CREATE POLICY "Users can delete their own watchlist alerts"
  ON public.watchlist_alerts FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
