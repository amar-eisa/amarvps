-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule keep-alive ping every 5 minutes to prevent Cloud from sleeping
SELECT cron.schedule(
  'keep-alive-ping',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wlmvzdhvvbbqidhvrdsh.supabase.co/functions/v1/keep-alive',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);