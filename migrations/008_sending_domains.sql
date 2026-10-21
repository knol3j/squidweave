-- Sending domain reputation and warmup state.
--
-- Tracks per-domain auth status, rolling 100-send reputation window, daily
-- volume counters, and warmup progression so outbound email can be gated
-- before reputation damage happens.

create table if not exists sending_domains (
  id text primary key,
  domain text not null unique,
  spf_status text default 'unknown',
  dkim_status text default 'unknown',
  dmarc_status text default 'unknown',
  dmarc_policy text,
  reputation_score numeric(5,2) default 0,
  warmup_started_at timestamptz,
  daily_cap integer default 50,
  sent_today integer default 0,
  sent_last_reset_at timestamptz default now(),
  bounce_count_100 integer default 0,
  sent_count_100 integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sending_domains_reputation on sending_domains (reputation_score desc);
