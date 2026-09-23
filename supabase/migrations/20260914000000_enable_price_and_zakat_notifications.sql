ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS price_alerts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS annual_zakat_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS zakat_reminder_last_sent_for date;

ALTER TABLE public.watchlist_alerts
  ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz;

CREATE INDEX IF NOT EXISTS user_preferences_price_alerts_enabled_idx
  ON public.user_preferences (price_alerts_enabled)
  WHERE price_alerts_enabled;

CREATE INDEX IF NOT EXISTS user_preferences_zakat_reminder_enabled_idx
  ON public.user_preferences (annual_zakat_reminder_enabled)
  WHERE annual_zakat_reminder_enabled;

CREATE INDEX IF NOT EXISTS watchlist_alerts_active_price_idx
  ON public.watchlist_alerts (user_id, ticker)
  WHERE is_active AND alert_type = 'price_target';
