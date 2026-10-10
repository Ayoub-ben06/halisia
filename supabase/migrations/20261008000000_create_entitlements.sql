CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'trial', 'premium')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  trial_used_at timestamptz,
  trial_reminder_sent_at timestamptz,
  trial_expired_sent_at timestamptz,
  onboarding_completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own entitlement" ON public.user_entitlements;
CREATE POLICY "Users can read their own entitlement" ON public.user_entitlements
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS subscriptions_active_user_idx
  ON public.subscriptions(user_id, status, current_period_end);

CREATE OR REPLACE FUNCTION public.halisia_has_premium_access(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing', 'past_due')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) OR EXISTS (
    SELECT 1 FROM public.user_entitlements
    WHERE user_id = p_user_id AND plan = 'trial' AND trial_ends_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.halisia_enforce_asset_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.halisia_has_premium_access(NEW.user_id) THEN RETURN NEW; END IF;
  IF (
    (SELECT count(*) FROM public.assets WHERE user_id = NEW.user_id)
    + (SELECT count(*) FROM public.crypto_assets WHERE user_id = NEW.user_id)
    + (SELECT count(*) FROM public.gold_assets WHERE user_id = NEW.user_id)
  ) >= 5 THEN
    RAISE EXCEPTION 'FREE_PORTFOLIO_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_assets_limit ON public.assets;
CREATE TRIGGER enforce_free_assets_limit BEFORE INSERT ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.halisia_enforce_asset_limit();
DROP TRIGGER IF EXISTS enforce_free_crypto_limit ON public.crypto_assets;
CREATE TRIGGER enforce_free_crypto_limit BEFORE INSERT ON public.crypto_assets
FOR EACH ROW EXECUTE FUNCTION public.halisia_enforce_asset_limit();
DROP TRIGGER IF EXISTS enforce_free_gold_limit ON public.gold_assets;
CREATE TRIGGER enforce_free_gold_limit BEFORE INSERT ON public.gold_assets
FOR EACH ROW EXECUTE FUNCTION public.halisia_enforce_asset_limit();

CREATE OR REPLACE FUNCTION public.halisia_enforce_watchlist_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.halisia_has_premium_access(NEW.user_id) THEN RETURN NEW; END IF;
  IF (SELECT count(*) FROM public.watchlist WHERE user_id = NEW.user_id) >= 3 THEN
    RAISE EXCEPTION 'FREE_WATCHLIST_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_watchlist_limit ON public.watchlist;
CREATE TRIGGER enforce_free_watchlist_limit BEFORE INSERT ON public.watchlist
FOR EACH ROW EXECUTE FUNCTION public.halisia_enforce_watchlist_limit();

CREATE OR REPLACE FUNCTION public.halisia_enforce_premium_alerts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.halisia_has_premium_access(NEW.user_id) THEN
    RAISE EXCEPTION 'PREMIUM_ALERTS_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_premium_watchlist_alerts ON public.watchlist_alerts;
CREATE TRIGGER enforce_premium_watchlist_alerts BEFORE INSERT ON public.watchlist_alerts
FOR EACH ROW EXECUTE FUNCTION public.halisia_enforce_premium_alerts();
