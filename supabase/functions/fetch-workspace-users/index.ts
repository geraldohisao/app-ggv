// Edge Function: Buscar usuários do Google Workspace
// Deno Deploy runtime

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkspaceUser {
  googleId: string;
  email: string;
  name: string;
  cargo: string;
  department: string;
  organizationalUnit: string;
  isActive: boolean;
  managerEmail: string | null;
  photoUrl: string | null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Pegar credenciais do Google (armazenadas no Supabase)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: credentials } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'google_workspace_credentials')
      .single()

    if (!credentials) {
      throw new Error('Credenciais do Google Workspace não configuradas')
    }

    // Lidar com value sendo TEXT ou JSONB (robusto)
    let googleCreds;
    try {
      if (typeof credentials.value === 'string') {
        // Tentar parse se for string
        googleCreds = JSON.parse(credentials.value)
      } else if (typeof credentials.value === 'object' && credentials.value !== null) {
        // Já é objeto, usar direto
        googleCreds = credentials.value
      } else {
        throw new Error('Formato de credenciais inválido: ' + typeof credentials.value)
      }
      
      // Validar que tem campos obrigatórios
      if (!googleCreds.private_key || !googleCreds.client_email) {
        throw new Error('Credenciais incompletas: faltam private_key ou client_email')
      }
      
      console.log('✅ Credenciais carregadas:', {
        client_email: googleCreds.client_email,
        project_id: googleCreds.project_id,
        has_private_key: !!googleCreds.private_key,
        private_key_length: googleCreds.private_key?.length || 0
      })
    } catch (parseError) {
      console.error('❌ Erro ao processar credenciais:', parseError)
      throw new Error('Falha ao processar credenciais do Google: ' + parseError.message)
    }

    // 2. Autenticar com Google usando Service Account
    const jwt = await createJWT(googleCreds)
    const accessToken = await getAccessToken(jwt, googleCreds)

    // 3. Buscar usuários do Google Workspace
    const response = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users?domain=grupoggv.com&maxResults=500&projection=full`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`)
    }

    const { users } = await response.json()

    // 4. Mapear usuários para formato GGV
    const mappedUsers: WorkspaceUser[] = users.map((googleUser: any) => ({
      googleId: googleUser.id,
      email: googleUser.primaryEmail,
      name: googleUser.name?.fullName || googleUser.primaryEmail,
      cargo: mapCargo(googleUser.organizations?.[0]?.title),
      department: mapDepartment(googleUser.organizations?.[0]?.department),
      organizationalUnit: mapOrgUnit(googleUser.orgUnitPath),
      isActive: !googleUser.suspended,
      managerEmail: googleUser.relations?.find((r: any) => r.type === 'manager')?.value || null,
      photoUrl: googleUser.thumbnailPhotoUrl || null,
    }))

    // 5. Retornar dados
    return new Response(
      JSON.stringify({
        success: true,
        users: mappedUsers,
        total: mappedUsers.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function createJWT(credentials: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    sub: 'geraldo@grupoggv.com', // Admin que faz a requisição
    scope: 'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  // Importar chave privada
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(credentials.private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  // Assinar
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  )

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))

  return `${signatureInput}.${encodedSignature}`
}

async function getAccessToken(jwt: string, credentials: any): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const data = await response.json()
  return data.access_token
}

function pemToBinary(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// ============================================
// MAPEAMENTO DE DADOS
// ============================================

function mapCargo(googleTitle: string | undefined): string {
  if (!googleTitle) return 'Analista'
  
  const exactMap: Record<string, string> = {
    'CEO': 'CEO',
    'COO': 'COO',
    'Head de Financeiro (a)': 'Head Financeiro',
    'Head Marketing': 'Head Marketing',
    'Head Comercial': 'Head Comercial',
    'Head Projetos': 'Head Projetos',
    'Coordenador Comercial': 'Coordenador Comercial',
    'Coordenador (a) de Projetos': 'Coordenador de Projetos',
    'Gerente de Projetos': 'Gerente de Projetos',
    'Analista de Marketing': 'Analista de Marketing',
    'Analista de Inteligência de Mercado': 'Analista de Inteligência de Mercado',
    'Assistente de Inteligência de Mercado': 'Assistente de Inteligência de Mercado',
    'SDR': 'SDR',
    'Closer': 'Closer',
    'Desenvolvedor (a)': 'Desenvolvedor',
    'Consultor (a)': 'Consultor',
    'Estágio': 'Estagiário',
    'Treinee': 'Trainee',
  }
  
  const title = googleTitle.trim()
  if (exactMap[title]) return exactMap[title]

  // Fallback por similaridade (minúsculas)
  const t = title.toLowerCase()

  if (t.includes('assistente') && t.includes('intelig')) {
    return 'Assistente de Inteligência de Mercado'
  }
  if (t.includes('analista') && t.includes('intelig')) {
    return 'Analista de Inteligência de Mercado'
  }

  // Outras variações comuns
  if (t.includes('desenvolvedor')) return 'Desenvolvedor'
  if (t.includes('consultor')) return 'Consultor'
  if (t.includes('head') && t.includes('proj')) return 'Head Projetos'
  if (t.includes('head') && t.includes('mkt')) return 'Head Marketing'
  if (t.includes('head') && t.includes('finan')) return 'Head Financeiro'
  if (t.includes('head') && t.includes('comer')) return 'Head Comercial'
  if (t.includes('coordenador') && t.includes('proj')) return 'Coordenador de Projetos'
  if (t.includes('coordenador') && t.includes('comer')) return 'Coordenador Comercial'
  if (t.includes('gerente') && t.includes('proj')) return 'Gerente de Projetos'
  if (t.includes('sdr')) return 'SDR'
  if (t.includes('closer')) return 'Closer'
  if (t.includes('trainee') || t.includes('treinee')) return 'Trainee'
  if (t.includes('estag')) return 'Estagiário'

  return 'Analista'
}

function mapDepartment(googleDept: string | undefined): string {
  if (!googleDept) return 'geral'
  
  const deptMap: Record<string, string> = {
    'Geral': 'geral',
    'Comercial': 'comercial',
    'Marketing': 'marketing',
    'Projetos': 'projetos',
    'Inovação': 'inovação',
    'Financeiro': 'financeiro',
  }
  
  return deptMap[googleDept.trim()] || 'geral'
}

function mapOrgUnit(ouPath: string | undefined): string {
  if (!ouPath || ouPath === '/') return 'Grupo GGV'
  
  const ouMap: Record<string, string> = {
    '/': 'Grupo GGV',
    '/Harpia Consultoria Empresarial': 'Harpia',
    '/GGV Inteligência em Vendas': 'GGV Inteligência',
  }
  
  return ouMap[ouPath.trim()] || 'Grupo GGV'
}

