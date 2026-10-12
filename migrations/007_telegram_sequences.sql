-- Telegram outreach sequence state.
--
-- Telegram is the current person-to-person messaging channel (LinkedIn outbound
-- is deferred until official API credentials are available). This table tracks
-- the state of each contact in a Telegram sequence.

create table if not exists telegram_sequences (
  id text primary key,
  person_id text references people(id) on delete cascade,
  telegram_handle text,
  chat_id text,
  last_message_body text,
  state text not null default 'pending' check (state in ('pending','messaged','replied','stopped')),
  message_sent_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_telegram_sequences_person on telegram_sequences (person_id);
create index if not exists idx_telegram_sequences_state on telegram_sequences (state);
