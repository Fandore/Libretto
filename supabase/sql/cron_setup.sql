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


-- 3. Riepilogo SETTIMANALE — ogni martedì alle 08:00 UTC (10:00 IT estate)
select cron.schedule(
  'libretto-weekly-report',                  -- nome del job (univoco)
  '0 8 * * 2',                               -- cron: ogni martedì alle 08:00 UTC
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


-- 4. Riepilogo MENSILE — 5° del mese alle 08:00 UTC (10:00 IT estate)
select cron.schedule(
  'libretto-monthly-report',                 -- nome del job
  '0 8 5 * *',                              -- cron: 5° del mese alle 08:00 UTC
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


-- 6. Anteprima DOMENICALE scadenze settimana — ogni domenica alle 08:00 UTC (10:00 IT estate)
select cron.schedule(
  'libretto-sunday-preview',                  -- nome del job
  '0 8 * * 0',                               -- cron: ogni domenica alle 08:00 UTC
  $$
  select extensions.http_post(
    url     := 'https://marvmbewsgxrabirugkk.supabase.co/functions/v1/send-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body    := '{"type":"sunday-preview"}'::jsonb
  ) as request_id;
  $$
);


-- 5. Promemoria MENSILE scadenze — 5° del mese alle 07:00 UTC (09:00 IT estate)
--    (un'ora prima del riepilogo mensile, così arriva come "agenda del mese")
select cron.schedule(
  'libretto-monthly-reminder',               -- nome del job
  '0 7 5 * *',                               -- cron: 5° del mese alle 07:00 UTC
  $$
  select extensions.http_post(
    url     := 'https://marvmbewsgxrabirugkk.supabase.co/functions/v1/send-monthly-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body    := '{}'::jsonb
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
-- select cron.unschedule('libretto-monthly-reminder');
-- select cron.unschedule('libretto-sunday-preview');

-- AGGIORNAMENTO SCHEDULE (martedì + giorno 5):
-- I job weekly e monthly-report erano già attivi con le vecchie schedule.
-- Eseguire questi 2 comandi nel SQL Editor per aggiornarli:
--
-- select cron.unschedule('libretto-weekly-report');
-- select cron.schedule('libretto-weekly-report','0 8 * * 2',
--   $$ select extensions.http_post(url:='https://marvmbewsgxrabirugkk.supabase.co/functions/v1/send-report',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||current_setting('app.cron_secret',true)),body:='{"type":"weekly"}'::jsonb) as request_id; $$);
--
-- select cron.unschedule('libretto-monthly-report');
-- select cron.schedule('libretto-monthly-report','0 8 5 * *',
--   $$ select extensions.http_post(url:='https://marvmbewsgxrabirugkk.supabase.co/functions/v1/send-report',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||current_setting('app.cron_secret',true)),body:='{"type":"monthly"}'::jsonb) as request_id; $$);

-- Test manuale della Edge Function da SQL (utile per debug):
-- select extensions.http_post(
--   url     := 'https://marvmbewsgxrabirugkk.supabase.co/functions/v1/send-report',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
--   ),
--   body    := '{"type":"monthly"}'::jsonb
-- ) as request_id;

-- Test manuale anteprima domenicale:
-- select extensions.http_post(
--   url     := 'https://marvmbewsgxrabirugkk.supabase.co/functions/v1/send-report',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
--   ),
--   body    := '{"type":"sunday-preview"}'::jsonb
-- ) as request_id;

-- Test manuale del promemoria scadenze:
-- select extensions.http_post(
--   url     := 'https://marvmbewsgxrabirugkk.supabase.co/functions/v1/send-monthly-reminder',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
--   ),
--   body    := '{}'::jsonb
-- ) as request_id;
