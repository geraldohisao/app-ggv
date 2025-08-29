-- Inserir dados de teste simples na tabela reactivated_leads
-- (adaptado para qualquer estrutura de colunas)

-- Primeiro, vamos ver exatamente quais colunas temos
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Inserir dados básicos (apenas colunas que sabemos que existem)
INSERT INTO public.reactivated_leads (
    sdr,
    filter, 
    status,
    count_leads
) VALUES 
('Andressa', 'Lista de reativação - Topo de funil', 'completed', 25),
('Lô-Ruama Oliveira', 'Lista de reativação - Fundo de funil', 'completed', 15),
('Isabel Pestilho', 'Lista de reativação - Topo de funil - NO SHOW', 'failed', 0),
('Camila Ataliba', 'Lista de reativação - Topo de funil', 'processing', 0),
('Andressa', 'Lista de reativação - Fundo de funil', 'pending', 0);

-- Verificar se os dados foram inseridos
SELECT COUNT(*) as total_inserted FROM public.reactivated_leads;

-- Mostrar os dados
SELECT * FROM public.reactivated_leads ORDER BY created_at DESC LIMIT 10;
