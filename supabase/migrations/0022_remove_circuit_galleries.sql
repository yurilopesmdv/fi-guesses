-- Correção editorial solicitada: nenhuma fotografia de galeria no catálogo.
update public.circuit_media set published=false where kind='photo' or storage_path not like 'https://media.formula1.com/%';
