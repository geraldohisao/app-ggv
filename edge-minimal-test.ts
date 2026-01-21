import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Teste básico - retornar dados mock
    const mockUsers = [
      {
        googleId: 'test-1',
        email: 'teste@grupoggv.com',
        name: 'Teste Usuario',
        cargo: 'SDR',
        department: 'comercial',
        organizationalUnit: 'Grupo GGV',
        isActive: true,
      }
    ]

    return new Response(
      JSON.stringify({ 
        success: true, 
        users: mockUsers, 
        total: 1,
        message: 'Edge Function funcionando! (mock data)'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

