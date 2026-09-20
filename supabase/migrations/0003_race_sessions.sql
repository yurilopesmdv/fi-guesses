alter table public.races
  add column fp1_utc timestamptz,
  add column fp2_utc timestamptz,
  add column fp3_utc timestamptz,
  add column sprint_quali_utc timestamptz,
  add column sprint_utc timestamptz,
  add column quali_utc timestamptz;
