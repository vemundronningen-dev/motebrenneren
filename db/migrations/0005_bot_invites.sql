-- Møtebrenneren – "inviter boten": en møteinvitasjon sendt til
-- gronntorsk@motebrenneren.no blir til en Recall.ai-bot som blir med i
-- Teams/Zoom/Meet-møtet med Møtebrenneren som kamera.
--
-- Én rad per invitasjon (iCalendar UID, + RECURRENCE-ID for et enkelt
-- flyttet møte i en serie). For gjentakende møter peker raden alltid på
-- NESTE forekomst; når en bot er ferdig bookes neste automatisk.
--
-- Personvern: ingen navn, e-postadresser, agenda eller møtetittel lagres.
-- Møtelenken trengs for å sende boten inn, og slettes når serien er ferdig.
--
-- Kjør med:
--   psql "$DATABASE_URL" -f db/migrations/0005_bot_invites.sql

create table if not exists bot_invites (
  id                  uuid primary key default gen_random_uuid(),
  invite_key          text not null unique,
  sequence            int not null default 0,
  meeting_url         text,
  rrule               text,
  exdates             timestamptz[] not null default '{}',
  time_zone           text not null default 'Europe/Oslo',
  -- Første forekomst i serien (DTSTART) - trengs for å regne ut neste.
  series_start        timestamptz not null,
  -- Starttid for forekomsten boten er booket til (ikke Recall sin join_at,
  -- som er litt tidligere slik at boten står klar).
  occurrence_start    timestamptz,
  duration_seconds    int not null check (duration_seconds > 0),
  participants        int not null check (participants between 1 and 500),
  label               text check (char_length(label) <= 60),
  slug                text references live_meetings(slug) on delete set null,
  bot_id              text unique,
  status              text not null default 'scheduled'
                        check (status in ('scheduled', 'cancelled', 'done', 'failed')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists bot_invites_created_at_idx on bot_invites (created_at desc);
