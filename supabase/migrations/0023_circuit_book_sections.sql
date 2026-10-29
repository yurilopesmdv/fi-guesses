-- Book editorial: as fotos são identificadas por trecho do traçado de Fórmula 1.
-- As policies existentes de circuit_media continuam limitando a escrita ao backend.
alter table public.circuit_media
  add column section_title text,
  add column section_turns text,
  add column section_description text;

-- O traçado atual de Albert Park tem 14 curvas desde a reforma de 2022.
-- Fonte: Formula1.com, Circuit Guide 2026 Australian Grand Prix.
update public.circuit_layouts set turns=14 where circuit_id='albert_park' and season=2026;

update public.circuit_layouts set notes='Traçado de Fórmula 1 · curvas numeradas no mapa oficial.' where season=2026;
