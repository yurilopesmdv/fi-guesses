import { createClient } from 'npm:@supabase/supabase-js@2';
import { createNewsHandler } from '../_shared/news-handler.ts';
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
Deno.serve(createNewsHandler(db,Deno.env.get('CONTENT_SYNC_SECRET') ?? ''));
