-- =============================================================================
-- Libretto — Setup pg_cron + pg_net per mail riepilogo automatiche
-- Eseguire nel Supabase SQL Editor (una volta sola, come progetto owner)
-- =============================================================================

-- 1. Abilita le estensioni richieste
--    (pg_cron e pg_net sono pre-installate su Supabase ma vanno abilitate)
create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;


-- 2. Salva il CRON_SECRET come parametro di database
--    Sostituisci 'CAMBIA_QUESTO_VALORE' con la stessa stringa che hai
--    impostato come secret CRON_SECRET nella Edge Function.
alter database postgres set app.cron_secret = 'CAMBIA_QUESTO_VALORE';


-- 3. Riepilogo SETTIMANALE — ogni lunedì alle 08:00 UTC (09:00/10:00 IT)
select cron.schedule(
  'libretto-weekly-report',                  -- nome del job (univoco)
  '0 8 * * 1',                               -- cron: ogni lunedì alle 08:00 UTC
  $$
  select extensions.http_post(
    url     := 'https://marvmbewsgxrabirugkk.supabase.co/functions/v1/send-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body    := '{"type":"weekly"}'::jsonb
  ) as request_id;
  $$
);


-- 4. Riepilogo MENSILE — primo del mese alle 08:00 UTC
select cron.schedule(
  'libretto-monthly-report',                 -- nome del job
  '0 8 1 * *',                              -- cron: primo del mese alle 08:00 UTC
  $$
  select extensions.http_post(
    url     := 'https://marvmbewsgxrabirugkk.supabase.co/functions/v1/send-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body    := '{"type":"monthly"}'::jsonb
  ) as request_id;
  $$
);


-- =============================================================================
-- Comandi utili per la manutenzione
-- =============================================================================

-- Visualizza i job attivi:
-- select * from cron.job;

-- Visualizza lo storico esecuzioni (ultime 20):
-- select * from cron.job_run_details order by start_time desc limit 20;

-- Elimina i job (se serve ricrearne uno):
-- select cron.unschedule('libretto-weekly-report');
-- select cron.unschedule('libretto-monthly-report');

-- Test manuale della Edge Function da SQL (utile per debug):
-- select extensions.http_post(
--   url     := 'https://marvmbewsgxrabirugkk.supabase.co/functions/v1/send-report',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
--   ),
--   body    := '{"type":"monthly"}'::jsonb
-- ) as request_id;
