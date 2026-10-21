-- 002_b2b_database.sql
-- Owned B2B company + person database. Free public discovery first, paid
-- enrichment layered on later. Every row carries provenance so confidence is
-- explainable rather than asserted.

create table if not exists companies (
  id                text not null primary key,
  domain            text not null unique,
  name              text,
  industry          text,
  employee_range    text,
  location          text,
  description       text,
  linkedin_url      text,
  tech_stack        text[] default '{}',
  source_urls       text[] default '{}',
  confidence        numeric(4,3) default 0,
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now()
);

create index if not exists idx_companies_industry   on companies (industry);
create index if not exists idx_companies_confidence on companies (confidence desc);
create index if not exists idx_companies_last_seen  on companies (last_seen_at desc);

create table if not exists people (
  id                text not null primary key,
  company_id        text references companies(id) on delete cascade,
  full_name         text,
  first_name        text,
  last_name         text,
  title             text,
  seniority         text,
  department         text,
  linkedin_url      text,
  email             text,
  email_status      text not null default 'unknown',
  email_verified_at timestamptz,
  source_url        text,
  source_type       text,
  confidence        numeric(4,3) default 0,
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  constraint people_email_status_check
    check (email_status in ('unknown','permuted','verified','invalid','risky'))
);

create index if not exists idx_people_company    on people (company_id);
create index if not exists idx_people_email      on people (email) where email is not null;
create index if not exists idx_people_email_stat on people (email_status);
create index if not exists idx_people_seniority  on people (seniority) where seniority is not null;

-- Identity keys. Upsert-by-identity becomes an index conflict instead of a
-- table scan, which is what makes re-ingesting the same source idempotent.
create table if not exists people_dedupe_index (
  id               text not null primary key,
  person_id        text not null references people(id) on delete cascade,
  linkedin_key     text unique,
  email_key        text unique,
  name_company_key text unique
);

create index if not exists idx_dedupe_person on people_dedupe_index (person_id);

-- Provenance. One row per (company, source) observation.
create table if not exists company_sources (
  id          text not null primary key,
  company_id  text not null references companies(id) on delete cascade,
  source_type text not null,
  source_url  text,
  fetched_at  timestamptz not null default now(),
  raw         jsonb default '{}'
);

create index if not exists idx_company_sources_company on company_sources (company_id);
create unique index if not exists idx_company_sources_unique
  on company_sources (company_id, source_type, coalesce(source_url, ''));

-- Account-level scoring. Written by the account scoring engine (Phase 3).
create table if not exists account_scores (
  id           text not null primary key,
  company_id   text not null unique references companies(id) on delete cascade,
  score        numeric(5,2) default 0,
  components   jsonb default '{}',
  model_version integer not null default 1,
  scored_at    timestamptz not null default now()
);

create index if not exists idx_account_scores_score on account_scores (score desc);
