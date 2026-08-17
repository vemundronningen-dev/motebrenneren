-- Møtebrenneren – skjema for Neon Postgres
--
-- Kjør med:
--   psql "$DATABASE_URL" -f db/migrations/0001_init.sql
-- eller lim innholdet inn i Neon sitt SQL-konsoll (dashboard -> SQL Editor).
--
-- Sikkerhetsmodell: I motsetning til et Supabase-oppsett (der databasen er
-- direkte nåbar fra nettleseren via en anon-nøkkel, og RLS/kolonne-grants
-- er selve sikkerhetsgrensen) kobler denne appen til Neon KUN fra
-- Next.js-serveren, med den fulltillitte DATABASE_URL-strengen som aldri
-- sendes til klienten (se src/lib/db/client.ts). Det finnes derfor ingen
-- egen "anon"-rolle å begrense her - all beskyttelse (f.eks. at
-- host_token aldri havner i et API-svar) håndheves i applikasjonskoden i
-- src/lib/meetings.ts, ikke i databasen.

create extension if not exists pgcrypto;

-- ============================================================================
-- burns
-- Hver rad er én fullført (eller stoppet) møteforbrenning som teller mot
-- den nasjonale telleren. Helt anonymt: ingen navn, ingen møtetittel.
-- ============================================================================
create table if not exists burns (
  id                 uuid primary key default gen_random_uuid(),
  amount             numeric not null check (amount >= 0 and amount < 10000000),
  duration_seconds   int not null check (duration_seconds > 0),
  estimated_seconds  int check (estimated_seconds > 0),
  participants       int not null check (participants between 1 and 500),
  created_at         timestamptz not null default now()
);

create index if not exists burns_created_at_idx on burns (created_at desc);

-- ============================================================================
-- live_meetings
-- Delte møterom. Anonymt: kun tall og status, aldri hva møtet handler om.
-- ============================================================================
create table if not exists live_meetings (
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
  -- Trengs for å akkumulere paused_total_seconds korrekt ved resume.
  paused_at              timestamptz,
  ended_at               timestamptz,
  -- Hemmelig - kun verten (localStorage) og API-rutene kjenner denne.
  -- Sendes ALDRI med i noe JSON-svar (se toPublic() i src/lib/meetings.ts).
  host_token             uuid not null default gen_random_uuid(),
  created_at             timestamptz not null default now()
);

create unique index if not exists live_meetings_slug_idx on live_meetings (slug);

-- ============================================================================
-- meeting_presence
-- Enkel heartbeat-basert "hvem ser på nå"-telling (erstatning for Supabase
-- Realtime Presence, som ikke finnes i ren Postgres/Neon). Hver klient som
-- har et møte åpent sender et heartbeat med jevne mellomrom; "antall som
-- ser på" = antall rader med last_seen nyere enn ~25 sekunder.
-- ============================================================================
create table if not exists meeting_presence (
  meeting_id  uuid not null references live_meetings(id) on delete cascade,
  session_id  text not null,
  last_seen   timestamptz not null default now(),
  primary key (meeting_id, session_id)
);

create index if not exists meeting_presence_last_seen_idx
  on meeting_presence (meeting_id, last_seen);
