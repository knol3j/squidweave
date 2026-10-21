-- 003_email_status_blocked.sql
--
-- Add the 'blocked' email status.
--
-- SMTP verification has to distinguish three kinds of 5xx reply, and the original
-- check constraint collapsed two of them into 'invalid':
--
--   invalid - the receiving server rejected THIS mailbox
--   blocked - the receiving server rejected OUR IP (Spamhaus and friends answer
--             550 for every address, so a real mailbox looks dead)
--   risky   - catch-all domain, or a provider that accepts every recipient
--
-- Recording a block as 'invalid' silently corrupts the database: every address
-- probed from a blocklisted IP gets marked dead, and the only signal that
-- something is wrong disappears. 'blocked' keeps that signal and leaves the row
-- eligible for a retry once the sending reputation is fixed.

alter table people drop constraint if exists people_email_status_check;

alter table people add constraint people_email_status_check
  check (email_status in ('unknown', 'permuted', 'verified', 'invalid', 'risky', 'blocked'));
