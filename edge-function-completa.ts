import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Iniciando busca de usuários do Google Workspace...')
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('📊 Buscando credenciais do Google...')
    const { data: credData, error: credError } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'google_workspace_credentials')
      .single()

    if (credError || !credData) {
      console.error('❌ Erro ao buscar credenciais:', credError)
      throw new Error('Credenciais do Google Workspace não configuradas')
    }

    console.log('✅ Credenciais encontradas')
    console.log('🔍 Tipo de value:', typeof credData.value)
    
    let googleCreds
    if (typeof credData.value === 'string') {
      console.log('📝 Parsing string...')
      googleCreds = JSON.parse(credData.value)
    } else if (typeof credData.value === 'object' && credData.value !== null) {
      console.log('📦 Usando object direto')
      googleCreds = credData.value
    } else {
      throw new Error(`Formato inválido: ${typeof credData.value}`)
    }

    console.log('✅ Client Email:', googleCreds.client_email)
    console.log('✅ Project ID:', googleCreds.project_id)
    
    console.log('🔐 Criando JWT...')
    const jwt = await createJWT(googleCreds)
    
    console.log('🎫 Obtendo access token...')
    const accessToken = await getAccessToken(jwt)
    
    console.log('📞 Chamando Google Workspace API...')
    const googleResponse = await fetch(
      'https://admin.googleapis.com/admin/directory/v1/users?domain=grupoggv.com&maxResults=500',
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text()
      console.error('❌ Google API error:', errorText)
      throw new Error(`Google API error: ${googleResponse.status} - ${errorText}`)
    }

    const googleData = await googleResponse.json()
    console.log(`✅ Google retornou ${googleData.users?.length || 0} usuários`)

    const mappedUsers = googleData.users.map((u: any) => ({
      googleId: u.id,
      email: u.primaryEmail,
      name: u.name?.fullName || u.primaryEmail,
      cargo: mapCargo(u.organizations?.[0]?.title),
      department: mapDepartment(u.organizations?.[0]?.department),
      organizationalUnit: mapOrgUnit(u.orgUnitPath),
      isActive: !u.suspended,
    }))

    console.log(`✅ ${mappedUsers.length} usuários mapeados com sucesso!`)

    return new Response(
      JSON.stringify({ success: true, users: mappedUsers, total: mappedUsers.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('❌ Erro geral:', error.message)
    console.error('❌ Stack:', error.stack)
    return new Response(
      JSON.stringify({ success: false, error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function createJWT(creds: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: creds.client_email,
    sub: 'geraldo@grupoggv.com',
    scope: 'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const encPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signInput = `${encHeader}.${encPayload}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(creds.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signInput)
  )

  const encSig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${signInput}.${encSig}`
}

async function getAccessToken(jwt: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`No access token: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

function pemToBinary(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
    .replace(/\\n/g, '')

  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes.buffer
}

function mapCargo(t: string | undefined): string {
  if (!t) return 'Analista'
  const m: Record<string, string> = {
    'CEO': 'CEO', 'COO': 'COO',
    'Head de Financeiro (a)': 'Head Financeiro',
    'Coordenador Comercial': 'Coordenador Comercial',
    'Coordenador (a) de Projetos': 'Coordenador de Projetos',
    'Gerente de Projetos': 'Gerente de Projetos',
    'Analista de Marketing': 'Analista de Marketing',
    'SDR': 'SDR', 'Closer': 'Closer',
    'Desenvolvedor (a)': 'Desenvolvedor',
    'Consultor (a)': 'Consultor',
    'Estágio': 'Estagiário',
    'Treinee': 'Trainee',
  }
  return m[t.trim()] || 'Analista'
}

function mapDepartment(d: string | undefined): string {
  if (!d) return 'geral'
  const m: Record<string, string> = {
    'Geral': 'geral', 'Comercial': 'comercial',
    'Marketing': 'marketing', 'Projetos': 'projetos',
    'Inovação': 'inovação', 'Financeiro': 'financeiro',
  }
  return m[d.trim()] || 'geral'
}

function mapOrgUnit(o: string | undefined): string {
  if (!o || o === '/') return 'Grupo GGV'
  const m: Record<string, string> = {
    '/': 'Grupo GGV',
    '/Harpia Consultoria Empresarial': 'Harpia',
    '/GGV Inteligência em Vendas': 'GGV Inteligência',
  }
  return m[o.trim()] || 'Grupo GGV'
}

