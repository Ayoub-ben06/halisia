-- Migrations en attente, regroupées pour l'éditeur SQL Supabase.
-- Toutes idempotentes (IF NOT EXISTS / DROP ... IF EXISTS) : réexécutables sans risque.

-- ===== 20260923000000_create_compliance_tracking.sql =====
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

-- ===== 20260924000000_positions_history_and_screening_cache.sql =====
-- Full screening result, reused by /api/alpha-screening and the app pages.
ALTER TABLE public.screening_cache ADD COLUMN IF NOT EXISTS result jsonb;

-- Users can edit and delete their own positions.
DROP POLICY IF EXISTS "Users can update their own assets" ON public.assets;
CREATE POLICY "Users can update their own assets" ON public.assets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own assets" ON public.assets;
CREATE POLICY "Users can delete their own assets" ON public.assets
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can insert their own crypto assets" ON public.crypto_assets
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can update their own crypto assets" ON public.crypto_assets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can delete their own crypto assets" ON public.crypto_assets
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own gold assets" ON public.gold_assets;
CREATE POLICY "Users can insert their own gold assets" ON public.gold_assets
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own gold assets" ON public.gold_assets;
CREATE POLICY "Users can update their own gold assets" ON public.gold_assets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own gold assets" ON public.gold_assets;
CREATE POLICY "Users can delete their own gold assets" ON public.gold_assets
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Transaction history for every asset class, with buy/sell side.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_asset_class_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_asset_class_check
  CHECK (asset_class IN ('stock', 'etf', 'crypto', 'gold', 'cash'));
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS side text NOT NULL DEFAULT 'buy';
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_side_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_side_check CHECK (side IN ('buy', 'sell'));
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_type text;
ALTER TABLE public.transactions ALTER COLUMN transaction_id SET DEFAULT gen_random_uuid()::text;

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
CREATE POLICY "Users can delete their own transactions" ON public.transactions
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own watchlist" ON public.watchlist;
CREATE POLICY "Users can update their own watchlist" ON public.watchlist
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Zakat payments, replacing the browser-only "paid" flag.
CREATE TABLE IF NOT EXISTS public.zakat_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paid_at date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS zakat_payments_user_idx ON public.zakat_payments (user_id, paid_at DESC);
ALTER TABLE public.zakat_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own zakat payments" ON public.zakat_payments;
CREATE POLICY "Users can read their own zakat payments" ON public.zakat_payments
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own zakat payments" ON public.zakat_payments;
CREATE POLICY "Users can insert their own zakat payments" ON public.zakat_payments
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own zakat payments" ON public.zakat_payments;
CREATE POLICY "Users can delete their own zakat payments" ON public.zakat_payments
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- ===== 20260924000001_compliance_alerts_preference.sql =====
-- Email when a watchlist stock with a "halal_change" alert changes Shariah status.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS compliance_alerts_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS user_preferences_compliance_alerts_enabled_idx
  ON public.user_preferences (compliance_alerts_enabled)
  WHERE compliance_alerts_enabled;

CREATE INDEX IF NOT EXISTS watchlist_alerts_active_halal_idx
  ON public.watchlist_alerts (ticker)
  WHERE is_active AND alert_type = 'halal_change';
