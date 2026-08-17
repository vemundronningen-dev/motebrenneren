-- Møtebrenneren – legg til valgfri møtetype/navn ("Allmøte", "Salgsmøte",
-- "Statusmøte" osv.), slik at man kan spore hva slags møter som brenner
-- mest, uten å lagre selve agendaen eller møtetittelen.
--
-- Kjør med:
--   psql "$DATABASE_URL" -f db/migrations/0002_meeting_label.sql

alter table live_meetings
  add column if not exists label text check (char_length(label) <= 60);

alter table burns
  add column if not exists label text check (char_length(label) <= 60);

create index if not exists burns_label_idx on burns (label) where label is not null;
