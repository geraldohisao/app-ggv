-- Cria/atualiza o scorecard "Ligação - Consultoria" com critérios e pesos
-- Execute este script no Supabase SQL Editor

-- 1) Garantir coluna active na tabela scorecards (variantes históricas)
DO $$
BEGIN
  BEGIN
    ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 2) Criar scorecard se não existir e ativá-lo (desativa os demais para evitar erro em .single())
DO $$
DECLARE
  v_scorecard_id UUID;
BEGIN
  -- Desativar outros ativos para evitar múltiplos ativos
  UPDATE scorecards SET active = FALSE WHERE active IS TRUE;

  -- Criar se não existir
  INSERT INTO scorecards (name, description, conversation_type, active)
  VALUES (
    'Ligação - Consultoria',
    'Scorecard para avaliação de ligações de consultoria (abertura, SPIN, pitch e próximos passos).',
    'outbound',
    TRUE
  )
  ON CONFLICT (name) DO UPDATE
    SET description = EXCLUDED.description,
        conversation_type = EXCLUDED.conversation_type,
        active = TRUE,
        updated_at = NOW();

  SELECT id INTO v_scorecard_id FROM scorecards WHERE name = 'Ligação - Consultoria' LIMIT 1;

  -- Limpar critérios anteriores
  DELETE FROM scorecard_criteria WHERE scorecard_id = v_scorecard_id;

  -- 3) Inserir critérios (max_score = 10). order_index sequencial.
  -- Abertura e Apresentação
  INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index) VALUES
    (v_scorecard_id, 'O SDR se apresentou para gerar autoridade?', '', 2, 10, 1),
    (v_scorecard_id, 'Validou o tempo com o cliente?', '', 3, 10, 2),
    (v_scorecard_id, 'Falou o objetivo da ligação?', '', 2, 10, 3);

  -- SPIN (peso 3 cada)
  INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index) VALUES
    (v_scorecard_id, 'Entendeu possíveis problemas que o cliente enfrenta na empresa?', '', 3, 10, 10),
    (v_scorecard_id, 'O vendedor conseguiu implicar em algum problema que o cliente falou?', '', 3, 10, 11),
    (v_scorecard_id, 'O vendedor validou se a solução atende a necessidade do cliente?', '', 3, 10, 12),
    (v_scorecard_id, 'Conseguiu validar o faturamento?', '', 3, 10, 13),
    (v_scorecard_id, 'Validou o tamanho da equipe comercial ou número de vendedores?', '', 3, 10, 14),
    (v_scorecard_id, 'Entendeu o que a empresa vende?', '', 3, 10, 15),
    (v_scorecard_id, 'Validou se tem algum controle de indicadores? Ex.: propostas, conversão de vendas, atividades dos vendedores', '', 3, 10, 16),
    (v_scorecard_id, 'Entendeu para qual público a empresa vende? (empresas, clientes finais, distribuidores)', '', 3, 10, 17),
    (v_scorecard_id, 'Entendeu os canais e como a empresa vende?', '', 3, 10, 18),
    (v_scorecard_id, 'Se o cliente tem vendedores, entendeu se são internos, externos ou representantes?', '', 3, 10, 19);

  -- PITCH
  INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index) VALUES
    (v_scorecard_id, 'Falou que a GGV já atendeu mais de 1.000 clientes em todo o Brasil?', '', 2, 10, 30),
    (v_scorecard_id, 'Caso o cliente tenha objeção, o vendedor conseguiu contornar agregando valor?', '', 3, 10, 31),
    (v_scorecard_id, 'Explicou para o cliente que a GGV é especialista em estruturar processos comerciais?', '', 2, 10, 32),
    (v_scorecard_id, 'O pré-vendedor conseguiu agregar valor e explicar o que a GGV faz para o cliente?', '', 3, 10, 33),
    (v_scorecard_id, 'Havendo interesse, explicou o objetivo da reunião de pré-diagnóstico com o especialista?', '', 2, 10, 34),
    (v_scorecard_id, 'Mostrou empatia pela dor do cliente?', '', 1, 10, 35);

  -- PRÓXIMOS PASSOS
  INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index) VALUES
    (v_scorecard_id, 'Se fez sentido a solução, saiu da ligação com dia e horário para o diagnóstico comercial?', '', 3, 10, 40),
    (v_scorecard_id, 'Se agendou com o especialista, confirmou dia e horário com o cliente?', '', 3, 10, 41),
    (v_scorecard_id, 'Se agendou com o especialista, comentou que enviará um invite/convite?', '', 3, 10, 42),
    (v_scorecard_id, 'Confirmou o e-mail do cliente?', '', 2, 10, 43);

  -- 4) (Opcional) Mapear às etapas de ligação, se a tabela existir
  BEGIN
    PERFORM 1 FROM information_schema.tables WHERE table_name = 'scorecard_call_type_mapping';
    IF FOUND THEN
      -- evitar duplicidade
      DELETE FROM scorecard_call_type_mapping WHERE scorecard_id = v_scorecard_id;
      INSERT INTO scorecard_call_type_mapping (scorecard_id, call_type) VALUES
        (v_scorecard_id, 'ligacao'),
        (v_scorecard_id, 'consultoria_vendas')
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 5) Verificações
SELECT 'Scorecard criado/atualizado' AS status,
       (SELECT id FROM scorecards WHERE name = 'Ligação - Consultoria' LIMIT 1) AS scorecard_id,
       (SELECT COUNT(*) FROM scorecard_criteria sc JOIN scorecards s ON s.id = sc.scorecard_id WHERE s.name = 'Ligação - Consultoria') AS total_criterios;


