-- Inserir dados de teste COM timestamp explícito

-- Inserir dados com created_at explícito
INSERT INTO public.reactivated_leads (
    created_at,
    sdr,
    filter, 
    status,
    count_leads
) VALUES 
(NOW(), 'Andressa', 'Lista de reativação - Topo de funil', 'completed', 25),
(NOW() - INTERVAL '1 hour', 'Lô-Ruama Oliveira', 'Lista de reativação - Fundo de funil', 'completed', 15),
(NOW() - INTERVAL '2 hours', 'Isabel Pestilho', 'Lista de reativação - Topo de funil - NO SHOW', 'failed', 0),
(NOW() - INTERVAL '30 minutes', 'Camila Ataliba', 'Lista de reativação - Topo de funil', 'processing', 0),
(NOW() - INTERVAL '10 minutes', 'Andressa', 'Lista de reativação - Fundo de funil', 'pending', 0);

-- Verificar se os dados foram inseridos
SELECT COUNT(*) as total_inserted FROM public.reactivated_leads;

-- Mostrar os dados inseridos
SELECT 
    id,
    created_at,
    sdr,
    filter,
    status,
    count_leads
FROM public.reactivated_leads 
ORDER BY created_at DESC;
