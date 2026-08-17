-- Møtebrenneren – init-migrasjon
-- Kjøres via Supabase CLI (supabase db push) eller lim inn i SQL Editor
-- i Supabase-dashboardet. Se README.md for full oppsettsguide.

create extension if not exists pgcrypto;

-- Supabase-prosjekter har som regel allerede USAGE på schema public for
-- anon/authenticated/service_role, men gjøres eksplisitt her slik at
-- migrasjonen er selvstendig kjørbar.
grant usage on schema public to anon, authenticated, service_role;

-- ============================================================================
-- burns
-- Hver rad er én fullført (eller stoppet) møteforbrenning som teller mot
-- den nasjonale telleren. Helt anonymt: ingen navn, ingen møtetittel.
-- ============================================================================
create table if not exists public.burns (
  id                 uuid primary key default gen_random_uuid(),
  amount             numeric not null check (amount >= 0 and amount < 10000000),
  duration_seconds   int not null check (duration_seconds > 0),
  estimated_seconds  int check (estimated_seconds > 0),
  participants       int not null check (participants between 1 and 500),
  created_at         timestamptz not null default now()
);

create index if not exists burns_created_at_idx on public.burns (created_at desc);

alter table public.burns enable row level security;

-- Anonym rolle kan KUN inserte. Ingen select-policy finnes, så ingen kan
-- lese enkeltrader (heller ikke via realtime). All faktisk validering av
-- beløpet skjer server-side i /api/burns (via anon-nøkkelen) FØR innsending
-- hit; sjekk-constraintene over er et siste sikkerhetsnett i databasen.
create policy "burns_insert_anon" on public.burns
  for insert
  to anon
  with check (
    amount >= 0 and amount < 10000000
    and duration_seconds > 0
    and participants between 1 and 500
  );

revoke all on public.burns from anon;
grant insert on public.burns to anon;
-- Merk: ingen "grant select" => selv om noen omgår RLS-policyen finnes,
-- er det ingen tabell-privilegium å lese med. Aggregater eksponeres kun
-- via get_national_stats() (security definer) lenger ned.

-- ============================================================================
-- live_meetings
-- Delte møterom. Anonymt: kun tall og status, aldri hva møtet handler om.
-- ============================================================================
create table if not exists public.live_meetings (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text unique not null,
  started_at             timestamptz,
  estimated_seconds      int not null check (estimated_seconds > 0),
  rate_per_hour          numeric not null check (rate_per_hour > 0),
  participants           int not null check (participants between 1 and 500),
  status                 text not null default 'lobby'
                           check (status in ('lobby', 'running', 'paused', 'ended')),
  paused_total_seconds   int not null default 0,
  -- Tidspunkt møtet ble satt på pause sist (null hvis ikke på pause nå).
  -- Trengs for å kunne akkumulere paused_total_seconds korrekt ved resume.
  -- Ikke i den opprinnelige spec-listen, men nødvendig for at pause/resume
  -- skal fungere presist.
  paused_at              timestamptz,
  ended_at               timestamptz,
  host_token             uuid not null default gen_random_uuid(),
  created_at             timestamptz not null default now()
);

create unique index if not exists live_meetings_slug_idx on public.live_meetings (slug);

alter table public.live_meetings enable row level security;

-- Rad-nivå: hvem som helst kan lese et møte via slug (det er anonymt -
-- ingen tittel/agenda/navn i tabellen). host_token beskyttes likevel på
-- KOLONNE-nivå nedenfor, siden RLS i Postgres kun styrer rader, ikke
-- kolonner.
create policy "live_meetings_select_anon" on public.live_meetings
  for select
  to anon
  using (true);

-- Ingen insert/update/delete-policy for anon: opprettelse og alle
-- statusendringer (start/pause/resume/stopp) skjer utelukkende via
-- API-routes som bruker service-role-nøkkelen og verifiserer host_token i
-- applikasjonskode før noe skrives.
revoke all on public.live_meetings from anon;
grant select (
  id, slug, started_at, estimated_seconds, rate_per_hour, participants,
  status, paused_total_seconds, paused_at, ended_at, created_at
) on public.live_meetings to anon;
-- host_token er bevisst UTELATT fra kolonnelisten over. Selv en klient som
-- gjør "select * from live_meetings" får "permission denied for column
-- host_token" – tokenet kan aldri hentes ut av anon-rollen, uansett RLS.
--
-- I praksis leser applikasjonen likevel aldri live_meetings direkte fra
-- klienten (verken for henting eller realtime); alt går via
-- /api/meetings/[slug] (GET) og Supabase Realtime Broadcast (ikke
-- postgres_changes), nettopp for å unngå enhver risiko for at hele raden
-- (inkl. host_token) lekker gjennom en postgres_changes-payload. Denne
-- kolonnebegrensningen er dermed forsvar i dybden.

-- ============================================================================
-- get_national_stats()
-- Eneste måte anon kan hente aggregerte tall fra burns på.
-- ============================================================================
create or replace function public.get_national_stats()
returns table (
  total_sum       numeric,
  total_meetings  bigint,
  meetings_today  bigint,
  sum_last_24h    numeric,
  avg_cost        numeric,
  pct_over_time   numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    coalesce(sum(b.amount), 0)::numeric                                  as total_sum,
    count(*)::bigint                                                     as total_meetings,
    count(*) filter (
      where b.created_at >= date_trunc('day', now())
    )::bigint                                                            as meetings_today,
    coalesce(sum(b.amount) filter (
      where b.created_at >= now() - interval '24 hours'
    ), 0)::numeric                                                       as sum_last_24h,
    coalesce(round(avg(b.amount)), 0)::numeric                           as avg_cost,
    coalesce(round(
      100.0 * count(*) filter (
        where b.estimated_seconds is not null
          and b.duration_seconds > b.estimated_seconds
      ) / nullif(count(*) filter (where b.estimated_seconds is not null), 0)
    ), 0)::numeric                                                       as pct_over_time
  from public.burns b;
end;
$$;

revoke all on function public.get_national_stats() from public;
grant execute on function public.get_national_stats() to anon;

-- ============================================================================
-- Realtime
-- Publikasjonen brukes IKKE av appen for live_meetings (se kommentar over –
-- broadcast brukes i stedet for å unngå kolonne-lekkasje av host_token),
-- men aktiveres likevel her siden oppgaven ber om det, og for evt. fremtidig
-- bruk / andre klienter.
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'burns'
  ) then
    alter publication supabase_realtime add table public.burns;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_meetings'
  ) then
    alter publication supabase_realtime add table public.live_meetings;
  end if;
end $$;
