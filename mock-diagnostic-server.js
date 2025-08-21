import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data para diferentes deal_ids
const mockDeals = {
  '62718': {
    companyName: 'Empresa Teste GGV',
    email: 'contato@empresateste.com.br',
    'ramo_de_atividade': 'Tecnologia',
    'setor_de_atuação': 'Tecnologia / Desenvolvimento / Sites',
    faturamento_mensal: 'R$ 101 a 300 mil/mês',
    'tamanho_equipe_comercial': 'De 4 a 10 colaboradores',
    org_name: 'Empresa Teste GGV',
    contact_email: 'contato@empresateste.com.br',
    person_email: 'contato@empresateste.com.br',
    _mockData: true // Flag para identificar dados simulados
  },
  '569934': {
    companyName: 'Tech Solutions LTDA',
    email: 'vendas@techsolutions.com.br',
    'ramo_de_atividade': 'Consultoria',
    'setor_de_atuação': 'Consultoria / Assessoria / Administração',
    faturamento_mensal: 'R$ 51 a 100 mil/mês',
    'tamanho_equipe_comercial': 'De 1 a 3 colaboradores',
    org_name: 'Tech Solutions LTDA',
    contact_email: 'vendas@techsolutions.com.br',
    person_email: 'vendas@techsolutions.com.br',
    _mockData: true
  },
  '62719': {
    companyName: 'Inovação Digital Ltda',
    email: 'comercial@inovacaodigital.com.br',
    'ramo_de_atividade': 'Marketing',
    'setor_de_atuação': 'Comunicação / Agências / Gráficas',
    faturamento_mensal: 'R$ 301 a 600 mil/mês',
    'tamanho_equipe_comercial': 'De 11 a 25 colaboradores',
    org_name: 'Inovação Digital Ltda',
    contact_email: 'comercial@inovacaodigital.com.br',
    person_email: 'comercial@inovacaodigital.com.br',
    _mockData: true
  }
};

// Endpoint principal para diagnóstico
app.get('/webhook/diag-ggv-register', (req, res) => {
  const dealId = req.query.deal_id;
  
  console.log('🔄 MOCK SERVER - Requisição recebida');
  console.log('📋 MOCK SERVER - Deal ID:', dealId);
  console.log('🕐 MOCK SERVER - Timestamp:', new Date().toISOString());
  console.log('📊 MOCK SERVER - Headers:', req.headers);
  console.log('🔍 MOCK SERVER - Query params:', req.query);
  
  if (!dealId) {
    console.log('❌ MOCK SERVER - Deal ID não fornecido');
    return res.status(400).json({
      error: 'Deal ID não fornecido',
      message: 'Parâmetro deal_id é obrigatório'
    });
  }
  
  let mockData = mockDeals[dealId];
  
  if (!mockData) {
    console.log('⚠️ MOCK SERVER - Deal ID não encontrado nos dados fixos:', dealId);
    console.log('🎲 MOCK SERVER - Gerando dados aleatórios para deal_id:', dealId);
    
    // Gerar dados aleatórios para qualquer deal_id
    const empresas = [
      'Empresa Inovadora Ltda', 'Soluções Comerciais S/A', 'Negócios Digitais Ltda',
      'Vendas & Cia', 'Crescimento Empresarial', 'Estratégia Comercial Ltda'
    ];
    
    const setores = [
      'Tecnologia / Desenvolvimento / Sites',
      'Consultoria / Assessoria / Administração', 
      'Comunicação / Agências / Gráficas',
      'E-commerce',
      'Educação',
      'Saúde / Medicina / Odontologia'
    ];
    
    const ramos = ['Tecnologia', 'Consultoria', 'Marketing', 'Vendas', 'Educação', 'Saúde'];
    
    const faturamentos = [
      'R$ 21 a 50 mil/mês',
      'R$ 51 a 100 mil/mês', 
      'R$ 101 a 300 mil/mês',
      'R$ 301 a 600 mil/mês',
      'R$ 601 mil a 1 milhão/mês'
    ];
    
    const equipes = [
      'De 1 a 3 colaboradores',
      'De 4 a 10 colaboradores', 
      'De 11 a 25 colaboradores'
    ];
    
    const empresaEscolhida = empresas[Math.floor(Math.random() * empresas.length)];
    const setorEscolhido = setores[Math.floor(Math.random() * setores.length)];
    const ramoEscolhido = ramos[Math.floor(Math.random() * ramos.length)];
    const faturamentoEscolhido = faturamentos[Math.floor(Math.random() * faturamentos.length)];
    const equipeEscolhida = equipes[Math.floor(Math.random() * equipes.length)];
    
    mockData = {
      companyName: empresaEscolhida,
      email: `contato@${empresaEscolhida.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com.br`,
      'ramo_de_atividade': ramoEscolhido,
      'setor_de_atuação': setorEscolhido,
      faturamento_mensal: faturamentoEscolhido,
      'tamanho_equipe_comercial': equipeEscolhida,
      org_name: empresaEscolhida,
      contact_email: `contato@${empresaEscolhida.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com.br`,
      person_email: `contato@${empresaEscolhida.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com.br`,
      _mockData: true,
      _generated: true // Flag para indicar que foi gerado automaticamente
    };
    
    console.log('🎲 MOCK SERVER - Dados gerados:', mockData);
  }
  
  console.log('✅ MOCK SERVER - Dados encontrados para deal_id:', dealId);
  console.log('📋 MOCK SERVER - Dados que serão retornados:', mockData);
  
  // Simular delay de rede
  setTimeout(() => {
    res.json(mockData);
    console.log('📤 MOCK SERVER - Resposta enviada com sucesso');
  }, 500);
});

// Endpoint de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    availableDeals: Object.keys(mockDeals)
  });
});

// Endpoint para listar deals disponíveis
app.get('/deals', (req, res) => {
  res.json({
    availableDeals: Object.keys(mockDeals),
    deals: mockDeals
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Mock Diagnostic Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Available deals: http://localhost:${PORT}/deals`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/webhook/diag-ggv-register?deal_id=62718`);
  console.log(`📊 Available deal IDs: ${Object.keys(mockDeals).join(', ')}`);
});
