-- SquidWeave Schema Migration v001
-- Initial relational schema for Postgres state backend

begin;

-- ── Core state table (key-value with JSONB for flexibility) ──────────────────

create table if not exists squidweave_state (
  state_key      text not null primary key,
  state          jsonb not null default '{}',
  updated_at     timestamptz not null default now()
);

comment on table squidweave_state is 'Primary state store — mirrors file-based JSON structure as JSONB';
comment on column squidweave_state.state_key is 'e.g. primary, campaign-{id}, etc.';
comment on column squidweave_state.state is 'Full serialized state blob';

-- ── Execution receipts (safety rail audit trail) ───────────────────────────

create table if not exists execution_receipts (
  id                text not null primary key,
  campaign_id       text,
  execution_type    text,
  idempotency_key    text,
  status            text not null default 'pending',
  dry_run           boolean not null default true,
  receipt           jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_receipts_campaign  on execution_receipts (campaign_id);
create index if not exists idx_receipts_idem      on execution_receipts (idempotency_key);
create index if not exists idx_receipts_status   on execution_receipts (status);
create index if not exists idx_receipts_created  on execution_receipts (created_at desc);

-- ── Investor records ────────────────────────────────────────────────────────

create table if not exists investor_records (
  id                text not null primary key,
  campaign_id      text,
  fund_name        text,
  fund_alias       text,
  stage_preference text,
  check_size_usd   bigint,
  sector_focus     text[],
  geo_focus        text[],
  linkedin_url     text,
  crunchbase_url   text,
  website          text,
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  thesis           text,
  portfolio_tags   text[],
  total_aum_usd    bigint,
  deal_count       integer,
  entry_score      float,
  confidence_score float,
  warm_path        text,
  source           text,
  created_at        timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_investors_campaign on investor_records (campaign_id);
create index if not exists idx_investors_score     on investor_records (entry_score desc);
create index if not exists idx_investors_fund      on investor_records (fund_name);
create index if not exists idx_investors_stage     on investor_records (stage_preference);

-- ── Funding outreach events ────────────────────────────────────────────────

create table if not exists funding_outreach_events (
  id                text not null primary key,
  campaign_id      text,
  investor_id      text,
  investor_fund    text,
  sequence_id      integer,
  step_type        text,
  step_status      text,
  email_subject    text,
  error_message    text,
  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_funding_events_campaign on funding_outreach_events (campaign_id);
create index if not exists idx_funding_events_investor  on funding_outreach_events (investor_id);
create index if not exists idx_funding_events_sent    on funding_outreach_events (sent_at desc);

-- ── Funding runs ────────────────────────────────────────────────────────────

create table if not exists funding_runs (
  id                text not null primary key,
  campaign_id      text,
  sequence_id      integer,
  target_count     integer,
  sent_count       integer,
  failed_count     integer,
  status           text not null default 'pending',
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_funding_runs_campaign on funding_runs (campaign_id);
create index if not exists idx_funding_runs_status   on funding_runs (status);

-- ── Automation runs ─────────────────────────────────────────────────────────

create table if not exists automation_runs (
  id                text not null primary key,
  campaign_id      text,
  reason           text,
  decision_id      text,
  content_pack_id  text,
  status           text not null default 'pending',
  agent_run_count  integer default 0,
  lifecycle        jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists idx_automation_runs_campaign on automation_runs (campaign_id);
create index if not exists idx_automation_runs_created   on automation_runs (created_at desc);

-- ── Content packs ────────────────────────────────────────────────────────────

create table if not exists content_packs (
  id                text not null primary key,
  campaign_id      text,
  automation_reason text,
  decision_id      text,
  locales          jsonb,
  generated_at     timestamptz not null default now()
);

create index if not exists idx_content_packs_campaign on content_packs (campaign_id);
create index if not exists idx_content_packs_generated on content_packs (generated_at desc);

-- ── Agent runs ────────────────────────────────────────────────────────────────

create table if not exists agent_runs (
  id                text not null primary key,
  campaign_id      text,
  automation_run_id text,
  agent_id         text,
  status           text not null default 'pending',
  result           jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists idx_agent_runs_campaign   on agent_runs (campaign_id);
create index if not exists idx_agent_runs_auto_run   on agent_runs (automation_run_id);

-- ── Sourced contacts (pre-migration from flat array) ───────────────────────

create table if not exists sourced_contacts (
  id                text not null primary key,
  campaign_id      text,
  full_name        text,
  first_name       text,
  last_name        text,
  company          text,
  company_website  text,
  email             text,
  phone             text,
  linkedin_url      text,
  city              text,
  state             text,
  country           text,
  segment           text,
  enrichment_status text default 'pending',
  sequence_status   text default 'unplanned',
  verification_status text default 'pending',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_contacts_campaign    on sourced_contacts (campaign_id);
create index if not exists idx_contacts_email      on sourced_contacts (email);
create index if not exists idx_contacts_enrich      on sourced_contacts (enrichment_status);

-- ── Collection-based entities (GHL Firestore model) ─────────────────────────

create table if not exists contacts (
  id                text not null primary key,
  location_id      text,
  company_name     text,
  full_name        text,
  first_name       text,
  last_name        text,
  email            text,
  phone            text,
  website          text,
  linkedin_url     text,
  city             text,
  state            text,
  country          text,
  tags             text[],
  custom_fields    jsonb default '{}',
  dnd              boolean default false,
  campaign_ids     text[],
  enrichment_status text default 'pending',
  verification_status text default 'pending',
  sequence_status   text default 'unplanned',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_contacts_location  on contacts (location_id);
create index if not exists idx_contacts_email    on contacts (email);
create index if not exists idx_contacts_campaigns on contacts using gin (campaign_ids);

create table if not exists pipelines (
  id                text not null primary key,
  location_id      text,
  name             text,
  stages           jsonb default '[]',
  show_in_funnel   boolean default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists opportunities (
  id                text not null primary key,
  location_id      text,
  pipeline_id      text,
  pipeline_stage_id text,
  contact_id      text,
  campaign_id      text,
  name             text,
  status           text default 'open',
  monetary_value   bigint default 0,
  currency         text default 'USD',
  source           text,
  custom_fields    jsonb default '{}',
  assigned_to      text,
  notes            text,
  lost_reason      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_opps_campaign   on opportunities (campaign_id);
create index if not exists idx_opps_contact    on opportunities (contact_id);
create index if not exists idx_opps_pipeline   on opportunities (pipeline_id);

create table if not exists workflows (
  id                text not null primary key,
  location_id      text,
  name             text,
  description      text,
  status           text default 'draft',
  trigger_type     text default 'manual',
  trigger_config   jsonb default '{}',
  step_ids         text[] default '{}',
  published_version jsonb,
  campaign_id      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_workflows_location on workflows (location_id);
create index if not exists idx_workflows_campaign on workflows (campaign_id);

create table if not exists notes (
  id                text not null primary key,
  contact_id       text,
  campaign_id      text,
  body             text,
  author           text,
  pinned           boolean default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_notes_contact  on notes (contact_id);
create index if not exists idx_notes_campaign on notes (campaign_id);

create table if not exists tasks (
  id                text not null primary key,
  contact_id       text,
  campaign_id      text,
  title            text,
  body             text,
  status           text default 'pending',
  priority         text default 'medium',
  due_date         timestamptz,
  assigned_to      text,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_tasks_contact   on tasks (contact_id);
create index if not exists idx_tasks_campaign  on tasks (campaign_id);
create index if not exists idx_tasks_status    on tasks (status);

create table if not exists calendar_events (
  id                text not null primary key,
  contact_id       text,
  campaign_id      text,
  title            text,
  description      text,
  start_time       timestamptz,
  end_time         timestamptz,
  status           text default 'scheduled',
  location         text,
  meeting_link     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_cal_events_contact on calendar_events (contact_id);
create index if not exists idx_cal_events_campaign on calendar_events (campaign_id);
create index if not exists idx_cal_events_start   on calendar_events (start_time);

create table if not exists tags (
  id                text not null primary key,
  location_id      text,
  name             text,
  color            text default '#6366f1',
  contact_count    integer default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Schema migrations tracking ────────────────────────────────────────────────

create table if not exists schema_migrations (
  version   text not null primary key,
  applied_at timestamptz not null default now()
);

-- Record this migration
insert into schema_migrations (version) values ('001');

commit;