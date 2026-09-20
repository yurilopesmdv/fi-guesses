-- F2/F3: etapas futuras vêm com horário placeholder no site; marcamos como "a confirmar"
alter table public.races add column times_tbc boolean not null default false;
