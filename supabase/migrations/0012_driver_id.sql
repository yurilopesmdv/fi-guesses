-- Identidade estável do piloto entre temporadas (driverId da Ergast/Jolpica; F2/F3 usam a própria sigla)
alter table public.drivers add column driver_id text;
update public.drivers set driver_id = code where series <> 'f1';
create index drivers_driver_id_idx on public.drivers (driver_id);
