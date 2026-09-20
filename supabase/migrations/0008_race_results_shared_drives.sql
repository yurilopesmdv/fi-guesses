-- Temporadas antigas: carros compartilhados têm dois pilotos na mesma posição
alter table public.race_results drop constraint race_results_pkey;
alter table public.race_results add primary key (season, round, position, driver_code);
