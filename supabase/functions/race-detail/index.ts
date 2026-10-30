// Carrega e guarda, na primeira consulta, as voltas e os pneus de um GP já disputado. Body: { season, round }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { fetchRaceLaps, fetchRaceStints } from '../_shared/f1api.ts';
import { createRaceDetailHandler } from '../_shared/race-detail.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(createRaceDetailHandler(db, { laps: fetchRaceLaps, stints: fetchRaceStints }));
