-- À exécuter dans Supabase après avoir remplacé l'URL et le secret.
-- Le job ne traite que les ETF conventionnels ; les ETF islamiques certifiés
-- et les ETF obligataires ont un verdict déterministe.
select cron.schedule(
  'quarterly-etf-screening',
  '0 2 1 */3 *',
  $$
  select net.http_post(
    url := 'https://VOTRE-DOMAINE.vercel.app/api/cron/screen-etfs',
    headers := jsonb_build_object(
      'Authorization', 'Bearer VOTRE_CRON_SECRET',
      'Content-Type', 'application/json'
    )
  )
  $$
);
