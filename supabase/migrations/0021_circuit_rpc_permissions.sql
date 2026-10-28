-- Supabase pode conceder EXECUTE a anon por privilégios padrão na criação.
-- RLS já protege os dados; restringe também a própria chamada dos RPCs.
revoke all on function public.circuit_catalog(integer), public.circuit_profile(text) from anon;
grant execute on function public.circuit_catalog(integer), public.circuit_profile(text) to authenticated;
