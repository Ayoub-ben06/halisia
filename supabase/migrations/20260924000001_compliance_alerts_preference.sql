-- Email when a watchlist stock with a "halal_change" alert changes Shariah status.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS compliance_alerts_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS user_preferences_compliance_alerts_enabled_idx
  ON public.user_preferences (compliance_alerts_enabled)
  WHERE compliance_alerts_enabled;

CREATE INDEX IF NOT EXISTS watchlist_alerts_active_halal_idx
  ON public.watchlist_alerts (ticker)
  WHERE is_active AND alert_type = 'halal_change';
