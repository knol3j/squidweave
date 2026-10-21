-- 006_merge_duplicate_edgar_company_rows.sql
--
-- The enrich script ran the EDGAR scout without `companyDomain`. EDGAR filings carry
-- no website field, so the engine synthesised `edgar.<name>.local` for each company
-- and wrote the officers there — while the real domain kept a separate, empty row.
-- This merges the nine known pairs back onto their real domain.
--
-- The map is explicit and hand-verified, not derived from the names. Two attempts to
-- infer it were both wrong: matching on the registrable label found 0 candidates
-- (the SEC legal name does not transform into a public domain), and fuzzy-matching
-- the company name matched an unrelated bank. A wrong merge corrupts two companies at
-- once, which is worse than leaving a duplicate visible.
--
-- The ~103 other `edgar.*.local` rows are NOT duplicates — they are companies whose
-- real website has simply never been discovered. They are left alone; `enrich-b2b.mjs`
-- now passes `companyDomain`, and `github-org` supplies a verified homepage for the
-- ones that publish one.
--
-- Safe to re-run: each pair is skipped once the synthetic row is gone.

create table if not exists _b2b_dup_map (synthetic_domain text primary key, real_domain text not null);
delete from _b2b_dup_map;
insert into _b2b_dup_map values
  ('edgar.hashicorp-inc.local',   'hashicorp.com'),
  ('edgar.new-relic-inc.local',   'newrelic.com'),
  ('edgar.pagerduty-inc.local',   'pagerduty.com'),
  ('edgar.twilio-inc.local',      'twilio.com'),
  ('edgar.microsoft-corp.local',  'microsoft.com'),
  ('edgar.roblox-corp.local',     'roblox.com'),
  ('edgar.pinterest-inc.local',   'pinterest.com'),
  ('edgar.hubspot-inc.local',     'hubspot.com'),
  ('edgar.block-inc.local',       'block.xyz');

do $$
declare
  mapping record;
  rec record;
  src_id text;
  dst_id text;
  moved int;
begin
  for mapping in select * from _b2b_dup_map loop
    select id into src_id from companies where domain = mapping.synthetic_domain;
    if src_id is null then
      raise notice 'already merged: %', mapping.synthetic_domain;
      continue;
    end if;

    select id into dst_id from companies where domain = mapping.real_domain;
    if dst_id is null then
      -- No real row to merge into, so simply rename. This is the case where the
      -- synthetic row is the only copy of the company.
      update companies set domain = mapping.real_domain, last_seen_at = now() where id = src_id;
      raise notice 'renamed % -> %', mapping.synthetic_domain, mapping.real_domain;
      continue;
    end if;

    -- Move the people by UPDATE, not insert-then-delete. An insert with
    -- `on conflict do nothing` silently skips rows that collide, and a following
    -- unconditional delete would then destroy exactly those rows. Updating company_id
    -- in place cannot lose data: the person keeps their id, their email, and their
    -- dedupe index entry, and only the owning company changes.
    update people set company_id = dst_id where company_id = src_id;
    get diagnostics moved = row_count;

    -- `people_dedupe_index` keys on person_id and cascades, so nothing to repoint.
    -- Provenance rows can collide on (company_id, source_type, source_url) when both
    -- rows were written by the same source, so move them one at a time and skip the
    -- collisions rather than aborting the whole merge.
    for rec in
      select id from company_sources where company_id = src_id
    loop
      begin
        update company_sources set company_id = dst_id where id = rec.id;
      exception when unique_violation then
        delete from company_sources where id = rec.id;
      end;
    end loop;

    -- `account_scores` is unique on company_id and is derived, not source data, so it
    -- is dropped here and recomputed rather than moved.
    delete from account_scores where company_id = src_id;

    delete from company_sources where company_id = src_id;
    delete from companies where id = src_id;

    raise notice 'merged % -> % (% people)', mapping.synthetic_domain, mapping.real_domain, moved;
  end loop;
end $$;

drop table _b2b_dup_map;
