-- 004_compliance.sql
--
-- Suppression and consent registry for the compliance layer.
--
-- The pre-existing `contacts.dnd` boolean answers "should we skip this one
-- contact". It cannot answer the questions that actually determine whether
-- outreach is lawful or deliverable:
--
--   - Did this ADDRESS opt out at another company, or years ago?
--   - Did this DOMAIN post a blanket no-solicitation policy?
--   - Has this address hard-bounced, making every future send a reputation hit?
--   - Did this person complain rather than quietly unsubscribe?
--
-- Those are address-level and domain-level facts that outlive any single contact
-- row, so they belong in their own tables rather than as flags that get
-- overwritten. `suppression_list` is keyed on the normalized address and
-- `domain_suppression` on the domain, both with a reason and an expiry, because
-- a bounce is often temporary and a spam complaint is not.
--
-- Nothing in this migration removes or alters existing data.

create table if not exists suppression_list (
  -- Normalized lowercase address. The primary key makes a duplicate opt-out
  -- impossible rather than merely unlikely.
  email          text primary key,
  reason         text not null,
  -- free-form: 'unsubscribe', 'spam_complaint', 'hard_bounce', 'manual', 'legal'
  source         text,
  detail         text,
  -- A temporary suppression (soft bounce, greylisting) expires on its own.
  -- A complaint or legal block is permanent, so expires_at stays null.
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_suppression_active on suppression_list (email, expires_at);

create table if not exists domain_suppression (
  domain         text primary key,
  reason         text not null,
  -- free-form: 'role_account_only', 'no_solicitation_policy', 'abuse_report',
  --           'spam_trap', 'manual', 'legal'
  source         text,
  detail         text,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);

-- Append-only audit of every compliance decision, so "why did we skip this" is
-- answerable after the fact. This is also the record that demonstrates a
-- suppression was honoured, which is the part regulators ask about.
create table if not exists compliance_events (
  id             text not null primary key,
  -- What was checked: an email address, a domain, or a company.
  subject_type   text not null check (subject_type in ('email', 'domain', 'company', 'person')),
  subject        text not null,
  decision       text not null check (decision in ('allow', 'block')),
  -- Machine-readable cause, e.g. 'suppression:spam_complaint',
  -- 'domain:no_solicitation_policy', 'email:hard_bounce', 'consent:missing'.
  reason         text not null,
  detail         text,
  -- The outreach this decision gated, when there was one.
  campaign_id    text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_compliance_events_subject
  on compliance_events (subject_type, subject, created_at desc);
create index if not exists idx_compliance_events_blocked
  on compliance_events (created_at desc) where decision = 'block';
