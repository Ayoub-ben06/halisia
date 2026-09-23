-- Rapport de clôture du portefeuille — planification côté Supabase.
--
-- Prérequis (Dashboard → Database → Extensions) : activer `pg_cron` et `pg_net`.
-- Remplacez ensuite les deux valeurs ci-dessous, puis exécutez ce script dans le
-- SQL Editor. 16:30 UTC correspond à la clôture Euronext (17:30 à Paris en hiver).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('daily-portfolio-summary')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-portfolio-summary'
);

SELECT cron.schedule(
  'daily-portfolio-summary',
  '30 16 * * 1-5', -- 16:30 UTC = clôture Euronext (jours ouvrés)
  $$
  SELECT net.http_post(
    url := 'https://VOTRE-APP.vercel.app/api/send-daily-summary',
    headers := '{"Authorization": "Bearer VOTRE_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Vérifier la planification :
--   SELECT jobid, jobname, schedule FROM cron.job;
-- Consulter les dernières exécutions :
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- Supprimer la tâche :
--   SELECT cron.unschedule('daily-portfolio-summary');
--
-- Heure d'été : pg_cron s'exécute en UTC et ne suit pas les changements d'heure.
-- Ajustez l'horaire à 15:30 UTC pendant l'heure d'été si vous voulez rester
-- exactement à 17:30 heure de Paris.
