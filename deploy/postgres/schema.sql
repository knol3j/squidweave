-- SquidWeave relational schema
-- Replaces the single-JSONB-blob approach with proper tables.

-- ─── Core domain ───────────────────────────────────────────────

create table if not exists campaigns (
  id text primary key,
  name text not null default '',
  status text not null default 'draft',
  goal text not null default '',
  latest_content_pack_id text,
  metrics jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists content_packs (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  variants jsonb not null default '[]',
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists target_profiles (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  target_id text not null default '',
  company text not null default '',
  segment text not null default '',
  fit_score numeric not null default 0,
  decision_maker text,
  signals jsonb not null default '[]',
  enrichment jsonb not null default '{}',
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists research_records (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  source text not null default '',
  url text,
  domain text,
  title text,
  insight text,
  summary text,
  finding text,
  content text,
  origin text,
  source_url text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists playbooks (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  tactics jsonb not null default '[]',
  observations jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists tactic_observations (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references campaigns(id) on delete cascade,
  observation text not null default '',
  tactic text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists memory_consolidations (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references campaigns(id) on delete cascade,
  snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── Outreach & engagement ─────────────────────────────────────

create table if not exists outreach_events (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  target_id text,
  type text not null default '',
  channel text not null default '',
  status text not null default '',
  sent_at timestamptz,
  subject text,
  error text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists analytics_events (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references campaigns(id) on delete cascade,
  type text not null default '',
  channel text not null default '',
  count integer not null default 0,
  date date,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── Automation & agents ───────────────────────────────────────

create table if not exists automation_runs (
  id text primary key,
  campaign_id text,
  reason text,
  status text not null default 'pending',
  result jsonb not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists agent_runs (
  id text primary key,
  campaign_id text,
  agent text not null default '',
  role text not null default '',
  status text not null default 'pending',
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists agent_heartbeats (
  agent text primary key,
  status text not null default 'unknown',
  last_run_at timestamptz,
  metadata jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists decisions (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references campaigns(id) on delete cascade,
  decision jsonb not null default '{}',
  reasoning text,
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── Prospecting ───────────────────────────────────────────────

create table if not exists sourced_contacts (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  email text not null default '',
  first_name text,
  last_name text,
  company text,
  title text,
  linkedin_url text,
  source text not null default '',
  score integer,
  status text not null default 'new',
  enrichment jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists prospecting_runs (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  status text not null default 'pending',
  source text not null default '',
  contacts_found integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists activation_runs (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  status text not null default 'pending',
  channels jsonb not null default '[]',
  contacts_activated integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── Funding ───────────────────────────────────────────────────

create table if not exists investor_records (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  name text not null default '',
  firm text not null default '',
  type text not null default '',
  status text not null default 'new',
  match_score numeric not null default 0,
  email text,
  linkedin text,
  check_size text,
  focus jsonb not null default '[]',
  stage text,
  location text,
  enrichment jsonb not null default '{}',
  last_enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists funding_outreach_events (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  investor_id text not null references investor_records(id) on delete cascade,
  investor_name text not null default '',
  type text not null default '',
  channel text not null default '',
  status text not null default '',
  sent_at timestamptz,
  responded_at timestamptz,
  subject text,
  body text,
  error text,
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists funding_runs (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  status text not null default 'pending',
  investors_targeted integer not null default 0,
  investors_reached integer not null default 0,
  responses integer not null default 0,
  meetings_booked integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── Execution receipts & DLQ ──────────────────────────────────

create table if not exists execution_receipts (
  id text primary key,
  campaign_id text,
  execution_type text not null default '',
  status text not null default 'pending',
  idempotency_key text,
  payload jsonb not null default '{}',
  result jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists dead_letter_queue (
  id text primary key,
  campaign_id text,
  run_id text,
  error text not null default '',
  payload jsonb not null default '{}',
  failed_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── CRM: GHL-style collections ────────────────────────────────

create table if not exists contacts (
  id text primary key,
  location_id text,
  campaign_ids jsonb not null default '[]',
  company_name text,
  full_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  website text,
  linkedin_url text,
  city text,
  state text,
  country text,
  tags jsonb not null default '[]',
  custom_fields jsonb not null default '{}',
  dnd boolean not null default false,
  enrichment_status text not null default 'pending',
  verification_status text not null default 'pending',
  sequence_status text not null default 'unplanned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists pipelines (
  id text primary key,
  location_id text,
  name text not null default '',
  stages jsonb not null default '[]',
  show_in_funnel boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists opportunities (
  id text primary key,
  location_id text,
  pipeline_id text references pipelines(id) on delete set null,
  pipeline_stage_id text,
  contact_id text references contacts(id) on delete set null,
  campaign_id text,
  name text not null default '',
  status text not null default 'open',
  monetary_value numeric(12,2) not null default 0,
  currency text not null default 'USD',
  source text,
  custom_fields jsonb not null default '{}',
  assigned_to text,
  notes text,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists workflows (
  id text primary key,
  location_id text,
  campaign_id text,
  name text not null default '',
  description text,
  status text not null default 'draft',
  trigger_type text not null default 'manual',
  trigger_config jsonb not null default '{}',
  step_ids jsonb not null default '[]',
  published_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists workflow_steps (
  id text primary key,
  workflow_id text not null references workflows(id) on delete cascade,
  type text not null default 'delay',
  "order" integer not null default 0,
  config jsonb not null default '{}',
  branches jsonb not null default '[]',
  parent_step_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists notes (
  id text primary key,
  contact_id text references contacts(id) on delete cascade,
  campaign_id text,
  body text not null default '',
  author text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists tasks (
  id text primary key,
  contact_id text references contacts(id) on delete set null,
  campaign_id text,
  title text not null default '',
  body text,
  status text not null default 'pending',
  priority text not null default 'medium',
  due_date timestamptz,
  assigned_to text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists calendar_events (
  id text primary key,
  contact_id text references contacts(id) on delete set null,
  campaign_id text,
  title text not null default '',
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled',
  location text,
  meeting_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists tags (
  id text primary key,
  location_id text,
  name text not null default '',
  color text not null default '#6366f1',
  contact_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── Funnels ───────────────────────────────────────────────────

create table if not exists funnels (
  id text primary key,
  location_id text,
  campaign_id text,
  workflow_id text,
  name text not null default '',
  description text,
  settings jsonb not null default '{}',
  published boolean not null default false,
  tags jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists funnel_steps (
  id text primary key,
  funnel_id text not null references funnels(id) on delete cascade,
  type text not null default 'question',
  "order" integer not null default 0,
  title text not null default '',
  description text,
  required boolean not null default true,
  placeholder text,
  fields jsonb not null default '[]',
  choices jsonb not null default '[]',
  next_step_map jsonb not null default '{}',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists funnel_submissions (
  id text primary key,
  funnel_id text not null references funnels(id) on delete cascade,
  contact_id text references contacts(id) on delete set null,
  opportunity_id text references opportunities(id) on delete set null,
  pipeline_id text references pipelines(id) on delete set null,
  pipeline_stage_id text,
  answers jsonb not null default '[]',
  contact_info jsonb not null default '{}',
  source text not null default 'funnel',
  metadata jsonb not null default '{}',
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── Messaging ─────────────────────────────────────────────────

create table if not exists message_templates (
  id text primary key,
  name text not null default '',
  channel text not null default '',
  subject text,
  body text not null default '',
  trigger_on text not null default 'funnel_submission',
  variables jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists message_sequences (
  id text primary key,
  name text not null default '',
  steps jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── Connector configs ─────────────────────────────────────────

create table if not exists connector_configs (
  connector text primary key,
  settings jsonb not null default '{}',
  enabled boolean not null default false,
  configured boolean not null default false,
  last_sync timestamptz,
  error text,
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── Ad Engine (SEO, ads, pixels, SMTP, posts) ─────────────────

create table if not exists ad_platform_credentials (
  platform text primary key,
  credentials jsonb not null default '{}',
  connected boolean not null default false,
  verified boolean not null default false,
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists ad_campaigns (
  id text primary key,
  platform text not null,
  name text not null default '',
  status text not null default 'draft',
  budget numeric(12,2),
  spend numeric(12,2) not null default 0,
  impressions integer not null default 0,
  clicks integer not null default 0,
  conversions integer not null default 0,
  ctr numeric(6,2),
  cpc numeric(8,2),
  roas numeric(6,2),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists retargeting_pixels (
  id text primary key,
  platform text not null,
  name text not null default '',
  code text not null default '',
  active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists scheduled_posts (
  id text primary key,
  platform text not null default '',
  content text not null default '',
  scheduled_for timestamptz,
  status text not null default 'scheduled',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists seo_analyses (
  id text primary key default gen_random_uuid()::text,
  url text not null,
  score integer not null default 0,
  issues jsonb not null default '[]',
  suggestions jsonb not null default '[]',
  word_count integer not null default 0,
  meta jsonb not null default '{}',
  checks jsonb not null default '{}',
  created_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

create table if not exists smtp_config (
  id text primary key default 'default',
  host text not null default '',
  port integer not null default 587,
  "user" text not null default '',
  pass text not null default '',
  from_address text not null default '',
  from_name text,
  secure boolean not null default false,
  updated_at timestamptz not null default now(),
  full_record jsonb not null default '{}'
);

-- ─── Indexes ───────────────────────────────────────────────────

create index if not exists idx_content_packs_campaign on content_packs(campaign_id);
create index if not exists idx_target_profiles_campaign on target_profiles(campaign_id);
create index if not exists idx_research_records_campaign on research_records(campaign_id);
create index if not exists idx_playbooks_campaign on playbooks(campaign_id);
create index if not exists idx_tactic_obs_campaign on tactic_observations(campaign_id);
create index if not exists idx_memory_cons_campaign on memory_consolidations(campaign_id);
create index if not exists idx_outreach_events_campaign on outreach_events(campaign_id);
create index if not exists idx_outreach_events_target on outreach_events(target_id);
create index if not exists idx_analytics_events_campaign on analytics_events(campaign_id);
create index if not exists idx_analytics_events_date on analytics_events(date);
create index if not exists idx_automation_runs_campaign on automation_runs(campaign_id);
create index if not exists idx_agent_runs_campaign on agent_runs(campaign_id);
create index if not exists idx_decisions_campaign on decisions(campaign_id);
create index if not exists idx_sourced_contacts_campaign on sourced_contacts(campaign_id);
create index if not exists idx_sourced_contacts_email on sourced_contacts(email);
create index if not exists idx_prospecting_runs_campaign on prospecting_runs(campaign_id);
create index if not exists idx_activation_runs_campaign on activation_runs(campaign_id);
create index if not exists idx_investors_campaign on investor_records(campaign_id);
create index if not exists idx_funding_outreach_campaign on funding_outreach_events(campaign_id);
create index if not exists idx_funding_outreach_investor on funding_outreach_events(investor_id);
create index if not exists idx_funding_runs_campaign on funding_runs(campaign_id);
create index if not exists idx_exec_receipts_campaign on execution_receipts(campaign_id);
create index if not exists idx_exec_receipts_idempotency on execution_receipts(idempotency_key);
create index if not exists idx_dlq_campaign on dead_letter_queue(campaign_id);
create index if not exists idx_contacts_location on contacts(location_id);
create index if not exists idx_contacts_email on contacts(email);
create index if not exists idx_contacts_campaign on contacts using gin(campaign_ids);
create index if not exists idx_opportunities_campaign on opportunities(campaign_id);
create index if not exists idx_opportunities_pipeline on opportunities(pipeline_id);
create index if not exists idx_opportunities_contact on opportunities(contact_id);
create index if not exists idx_workflows_campaign on workflows(campaign_id);
create index if not exists idx_workflow_steps_workflow on workflow_steps(workflow_id);
create index if not exists idx_notes_contact on notes(contact_id);
create index if not exists idx_tasks_contact on tasks(contact_id);
create index if not exists idx_calendar_contact on calendar_events(contact_id);
create index if not exists idx_funnels_campaign on funnels(campaign_id);
create index if not exists idx_funnel_steps_funnel on funnel_steps(funnel_id);
create index if not exists idx_funnel_submissions_funnel on funnel_submissions(funnel_id);
create index if not exists idx_ad_campaigns_platform on ad_campaigns(platform);
create index if not exists idx_seo_analyses_url on seo_analyses(url);
create index if not exists idx_scheduled_posts_status on scheduled_posts(status);
