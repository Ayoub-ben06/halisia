-- À exécuter une fois dans le SQL Editor Supabase après avoir remplacé
-- l'URL et le secret. Le rappel Zakat est protégé contre les doublons.
--
-- vercel.json planifie déjà cette route une fois par jour (limite du plan
-- Vercel gratuit). Ce script permet un passage toutes les 15 minutes (alertes
-- de prix plus réactives) ; les deux peuvent coexister sans doublon d'email.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'halisia-event-notifications';

SELECT cron.schedule(
  'halisia-event-notifications',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://VOTRE-APP.vercel.app/api/process-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer VOTRE_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
