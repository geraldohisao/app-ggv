-- Verificar se as funções existem no Supabase
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_dashboard_metrics',
    'get_unique_sdrs', 
    'get_sdr_metrics',
    'get_call_volume_data_with_analysis',
    'get_dashboard_metrics_with_analysis',
    'get_call_details'
  )
ORDER BY routine_name;
