-- 005_relocate_synthetic_edgar_domains.sql
--
-- The first EDGAR ingest synthesised `edgar.<name>.local` domains because Form 4
-- filings do not carry a website field. Those rows are correct data under a key no
-- one recognises, so this moves the company to its real domain and repoints the
-- people at it.
--
-- In this schema `companies.id` is a UUID and `domain` is a separate unique text
-- column, and `people.company_id` points at that UUID. Relocating a company is
-- therefore just a `domain` update — every child reference stays valid, which is
-- why no child tables are touched here.
--
-- Applied once; safe to re-run, since each step is a no-op once no matching
-- synthetic row remains.
--
-- The map is explicit rather than derived: the filing's legal name ("NVIDIA CORP",
-- "DATADOG, INC.") does not reliably transform into the public domain, and a wrong
-- guess would merge two unrelated companies.

-- A `do` block runs in its own transaction, so a temp table created outside it is
-- not visible inside. Use a real table and drop it at the end.
create table if not exists _b2b_relocate_map (old_domain text primary key, new_domain text not null);
delete from _b2b_relocate_map;
insert into _b2b_relocate_map values
  ('edgar.nvidia-corp.local',    'nvidia.com'),
  ('edgar.microsoft-corp.local', 'microsoft.com'),
  ('edgar.datadog-inc.local',    'datadoghq.com'),
  ('edgar.snowflake-inc.local',  'snowflake.com'),
  ('edgar.cloudflare-inc.local', 'cloudflare.com');

do $$
declare
  mapping record;
  moved int;
begin
  for mapping in select * from _b2b_relocate_map loop
    -- Skip when the synthetic row is already gone, or when the real domain is
    -- already occupied by a different company.
    if not exists (select 1 from companies where domain = mapping.old_domain)
       or exists (select 1 from companies where domain = mapping.new_domain)
    then
      raise notice 'skipped % -> %', mapping.old_domain, mapping.new_domain;
      continue;
    end if;

    update companies
       set domain = mapping.new_domain, last_seen_at = now()
     where domain = mapping.old_domain;
    get diagnostics moved = row_count;

    raise notice 'relocated % -> %', mapping.old_domain, mapping.new_domain;
  end loop;
end $$;

drop table _b2b_relocate_map;
