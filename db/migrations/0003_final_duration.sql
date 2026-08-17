-- Møtebrenneren – lagre det endelige (evt. korrigerte) resultatet på selve
-- møtet, i stedet for å alltid regne varighet/beløp ut fra rå tidsstempler.
--
-- Bakgrunn: verten kan nå korrigere varigheten ved stopp (for møter man
-- glemte å avslutte i tide) - da stemmer ikke lenger
-- started_at/ended_at/paused_total_seconds med det som faktisk telles mot
-- Norge. final_duration_seconds/final_amount er sannheten for et avsluttet
-- møte; de rå tidsstemplene beholdes uendret som en ærlig logg av når
-- møtet faktisk sto åpent.
--
-- Kjør med:
--   psql "$DATABASE_URL" -f db/migrations/0003_final_duration.sql

alter table live_meetings
  add column if not exists final_duration_seconds int check (final_duration_seconds > 0);

alter table live_meetings
  add column if not exists final_amount numeric check (final_amount >= 0);
