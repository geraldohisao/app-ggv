const buildError = (statusCode, message) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: message }),
});

exports.handler = async (event) => {
  const token = event.queryStringParameters?.token || event.queryStringParameters?.t || '';
  if (!token) return buildError(400, 'Token obrigatório.');

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return buildError(500, 'Supabase não configurado.');

  const endpoint = `${supabaseUrl}/rest/v1/diagnostic_public_reports?token=eq.${encodeURIComponent(token)}&select=token,report,expires_at`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return buildError(500, `Falha ao buscar relatório: ${text || res.status}`);
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) return buildError(404, 'Organograma não encontrado.');

    const row = rows[0];
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return buildError(410, 'Link expirado.');
    }

    const report = row.report || null;
    if (report?.type && report.type !== 'organograma') {
      return buildError(400, 'Token inválido para organograma.');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report }),
    };
  } catch (error) {
    return buildError(500, error?.message || 'Erro inesperado.');
  }
};
