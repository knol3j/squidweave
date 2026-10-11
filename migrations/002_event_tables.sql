-- SquidWeave Schema Migration v002
-- Relational tables for high-volume outreach and analytics events.

begin;

create table if not exists outreach_events (
  id            text not null primary key,
  campaign_id   text not null,
  target_id     text,
  type          text not null,
  channel       text not null default 'email',
  status        text,
  timestamp     timestamptz not null default now(),
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists idx_outreach_events_campaign on outreach_events (campaign_id);
create index if not exists idx_outreach_events_target   on outreach_events (target_id);
create index if not exists idx_outreach_events_type     on outreach_events (type);
create index if not exists idx_outreach_events_ts       on outreach_events (timestamp desc);

create table if not exists analytics_events (
  id            text not null primary key,
  campaign_id   text not null,
  type          text not null,
  channel       text not null default 'email',
  value         numeric,
  count         integer not null default 1,
  timestamp     timestamptz not null default now(),
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists idx_analytics_events_campaign on analytics_events (campaign_id);
create index if not exists idx_analytics_events_type     on analytics_events (type);
create index if not exists idx_analytics_events_ts       on analytics_events (timestamp desc);

commit;
