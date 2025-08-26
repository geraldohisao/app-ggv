// Seed de chamadas no Supabase para testes locais
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function randomChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

async function fetchSdRs() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, user_function')
    .in('user_function', ['SDR','Closer']);
  if (error) throw error;
  return data?.map((r) => r.id) || [];
}
const TYPES = ['diagnostico','ligacao','proposta'];
const DIRS = ['inbound','outbound'];

async function main() {
  const SDRS = await fetchSdRs();
  const rows = Array.from({ length: 20 }).map((_, i) => ({
    provider_call_id: `seed_${Date.now()}_${i}`,
    from_number: '+5511' + String(900000000 + Math.floor(Math.random()*9999999)),
    to_number: '+5511' + String(800000000 + Math.floor(Math.random()*9999999)),
    agent_id: 'agent_' + (1 + (i%4)),
    sdr_id: SDRS.length ? randomChoice(SDRS) : null,
    deal_id: `DEAL-${7400 + i}`,
    call_type: randomChoice(TYPES),
    direction: randomChoice(DIRS),
    status: 'processed',
    duration: 60 + Math.floor(Math.random()*600),
    recording_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    created_at: new Date(Date.now() - Math.floor(Math.random()*4)*24*3600*1000).toISOString(),
  }));

  const { error } = await supabase.from('calls').insert(rows, { returning: 'minimal' });
  if (error) throw error;
  console.log('Seed inserido com sucesso');
}

main().catch((e) => { console.error(e); process.exit(1); });


