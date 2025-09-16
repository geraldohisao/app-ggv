-- RESTAURAR FUNÇÃO FUNCIONANDO COM DURATION_FORMATTED

-- Primeiro, remover a função problemática
DROP FUNCTION IF EXISTS public.get_calls_with_formatted_duration(INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, TEXT);

-- Voltar para a implementação original no callsService.ts que funcionava
-- Mas vamos adicionar o campo duration_formatted via SELECT direto

