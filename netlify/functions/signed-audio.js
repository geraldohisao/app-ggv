// Netlify Function: signed-audio
// Gera uma URL assinada temporária para um arquivo de áudio no Supabase Storage
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || (globalThis.APP_CONFIG?.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // use service role em functions

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[signed-audio] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const url = new URL(event.rawUrl);
    const callId = url.searchParams.get('callId');
    if (!callId) {
      return { statusCode: 400, body: 'Missing callId' };
    }
    if (!supabase) {
      return { statusCode: 500, body: 'Supabase not configured' };
    }

    // Buscar info da call
    const { data, error } = await supabase
      .from('calls')
      .select('audio_bucket, audio_path, recording_url')
      .eq('id', callId)
      .single();
    if (error) throw error;
    if (!data) return { statusCode: 404, body: 'Call not found' };

    // Se já houver recording_url pública/externa, repassar
    if (data.recording_url) {
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: data.recording_url, expiresIn: null })
      };
    }

    if (!data.audio_bucket || !data.audio_path) {
      return { statusCode: 404, body: 'Recording not available' };
    }

    // Gerar URL assinada (expiração 60 min)
    const { data: signed, error: signErr } = await supabase
      .storage
      .from(data.audio_bucket)
      .createSignedUrl(data.audio_path, 60 * 60);
    if (signErr) throw signErr;
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: signed?.signedUrl, expiresIn: 3600 })
    };
  } catch (e) {
    console.error('[signed-audio] error', e);
    return { statusCode: 500, body: 'Internal Error' };
  }
};


