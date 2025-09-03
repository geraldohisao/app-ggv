-- Criar scorecard de exemplo para testes
-- Sistema de avaliação de chamadas comerciais

-- 1. Criar scorecard principal
INSERT INTO scorecards (
  id,
  name,
  description,
  conversation_type,
  active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Scorecard Vendas GGV',
  'Avaliação padrão para chamadas de prospecção e vendas da GGV',
  'prospecting',
  true,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Obter o ID do scorecard criado
DO $$
DECLARE
    scorecard_id UUID;
BEGIN
    -- Buscar o scorecard criado
    SELECT id INTO scorecard_id 
    FROM scorecards 
    WHERE name = 'Scorecard Vendas GGV' 
    LIMIT 1;
    
    -- Se não encontrou, criar um novo
    IF scorecard_id IS NULL THEN
        scorecard_id := gen_random_uuid();
        INSERT INTO scorecards (id, name, description, conversation_type, active, created_at, updated_at)
        VALUES (scorecard_id, 'Scorecard Vendas GGV', 'Avaliação padrão para chamadas de prospecção e vendas da GGV', 'prospecting', true, NOW(), NOW());
    END IF;
    
    -- Limpar critérios existentes
    DELETE FROM scorecard_criteria WHERE scorecard_id = scorecard_id;
    
    -- 2. Criar critérios do scorecard
    INSERT INTO scorecard_criteria (
      id,
      scorecard_id,
      name,
      description,
      weight,
      max_score,
      order_index,
      created_at,
      updated_at
    ) VALUES 
    -- Critério 1: Apresentação
    (
      gen_random_uuid(),
      scorecard_id,
      'Apresentação Pessoal',
      'SDR se apresenta adequadamente mencionando nome, empresa e motivo da ligação',
      20,
      10,
      1,
      NOW(),
      NOW()
    ),
    -- Critério 2: Descoberta de Necessidades
    (
      gen_random_uuid(),
      scorecard_id,
      'Descoberta de Necessidades',
      'Faz perguntas para entender o negócio, desafios e necessidades do cliente',
      30,
      10,
      2,
      NOW(),
      NOW()
    ),
    -- Critério 3: Proposta de Valor
    (
      gen_random_uuid(),
      scorecard_id,
      'Proposta de Valor',
      'Apresenta soluções conectadas às necessidades identificadas do cliente',
      25,
      10,
      3,
      NOW(),
      NOW()
    ),
    -- Critério 4: Tratamento de Objeções
    (
      gen_random_uuid(),
      scorecard_id,
      'Tratamento de Objeções',
      'Responde adequadamente a dúvidas e objeções do cliente',
      15,
      10,
      4,
      NOW(),
      NOW()
    ),
    -- Critério 5: Próximos Passos
    (
      gen_random_uuid(),
      scorecard_id,
      'Próximos Passos',
      'Define claramente os próximos passos e agenda reunião ou follow-up',
      10,
      10,
      5,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Scorecard criado com sucesso: %', scorecard_id;
END $$;

-- 3. Verificar se foi criado corretamente
SELECT 
  s.name as scorecard,
  s.active,
  COUNT(sc.id) as total_criterios
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.name = 'Scorecard Vendas GGV'
GROUP BY s.id, s.name, s.active;

-- 4. Listar critérios criados
SELECT 
  sc.name as criterio,
  sc.description,
  sc.weight as peso,
  sc.max_score as pontuacao_maxima,
  sc.order_index as ordem
FROM scorecards s
JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.name = 'Scorecard Vendas GGV'
ORDER BY sc.order_index;
