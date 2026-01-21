-- ==========================================
-- REFORÇO DE SEGURANÇA (HARDENING) - MÓDULO OKR
-- Foco: RLS Robusto e Transacionalidade (RPC)
-- ==========================================

-- 1. REFINAMENTO DE RLS PARA KEY RESULTS
-- Atualmente as políticas de key_results são muito permissivas.
-- Vamos espelhar a lógica dos OKRs pai.

ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "key_results_access" ON key_results;

-- Leitura: Qualquer um que pode ver o OKR
CREATE POLICY "key_results_select" ON key_results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM okrs
            WHERE okrs.id = key_results.okr_id
        )
    );

-- Escrita: Apenas quem tem permissão de UPDATE no OKR pai
CREATE POLICY "key_results_manage" ON key_results
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM okrs
            WHERE okrs.id = key_results.okr_id
            AND (
                -- CEO
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
                OR 
                -- HEAD do mesmo departamento
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND department = okrs.department)
            )
        )
    );

-- 2. RPC TRANSACIONAL PARA SALVAR OKR + KRs
-- Resolve o problema de atomicidade e transacionalidade.

CREATE OR REPLACE FUNCTION save_okr_with_krs(
    p_okr_id UUID, -- NULL para criar novo
    p_okr_data JSONB,
    p_krs_data JSONB -- Array de KRs
)
RETURNS JSONB AS $$
DECLARE
    v_okr_id UUID;
    v_kr JSONB;
    v_incoming_kr_ids UUID[];
BEGIN
    -- 1. Inserir ou Atualizar OKR
    IF p_okr_id IS NULL THEN
        INSERT INTO okrs (
            user_id, level, department, owner, objective, 
            start_date, end_date, periodicity, status, notes
        ) VALUES (
            auth.uid(),
            (p_okr_data->>'level'),
            (p_okr_data->>'department'),
            (p_okr_data->>'owner'),
            (p_okr_data->>'objective'),
            (p_okr_data->>'start_date')::DATE,
            (p_okr_data->>'end_date')::DATE,
            (p_okr_data->>'periodicity'),
            COALESCE(p_okr_data->>'status', 'não iniciado'),
            p_okr_data->>'notes'
        ) RETURNING id INTO v_okr_id;
    ELSE
        UPDATE okrs SET
            level = COALESCE(p_okr_data->>'level', level),
            department = COALESCE(p_okr_data->>'department', department),
            owner = COALESCE(p_okr_data->>'owner', owner),
            objective = COALESCE(p_okr_data->>'objective', objective),
            start_date = COALESCE((p_okr_data->>'start_date')::DATE, start_date),
            end_date = COALESCE((p_okr_data->>'end_date')::DATE, end_date),
            periodicity = COALESCE(p_okr_data->>'periodicity', periodicity),
            status = COALESCE(p_okr_data->>'status', status),
            notes = COALESCE(p_okr_data->>'notes', notes),
            updated_at = NOW()
        WHERE id = p_okr_id
        RETURNING id INTO v_okr_id;
        
        IF v_okr_id IS NULL THEN
            RAISE EXCEPTION 'OKR não encontrado ou acesso negado.';
        END IF;
    END IF;

    -- 2. Coletar IDs dos KRs que estão chegando para deletar os órfãos depois
    v_incoming_kr_ids := ARRAY(
        SELECT (value->>'id')::UUID 
        FROM jsonb_array_elements(p_krs_data) 
        WHERE (value->>'id') IS NOT NULL
    );

    -- 3. Deletar KRs que não estão no novo conjunto (Soft Delete ou Hard Delete conforme política)
    DELETE FROM key_results 
    WHERE okr_id = v_okr_id 
    AND (id IS DISTINCT FROM ALL(v_incoming_kr_ids) OR v_incoming_kr_ids IS NULL);

    -- 4. Inserir ou Atualizar cada KR
    FOR v_kr IN SELECT * FROM jsonb_array_elements(p_krs_data) LOOP
        IF (v_kr->>'id') IS NOT NULL AND EXISTS (SELECT 1 FROM key_results WHERE id = (v_kr->>'id')::UUID) THEN
            UPDATE key_results SET
                title = v_kr->>'title',
                type = v_kr->>'type',
                direction = v_kr->>'direction',
                start_value = (v_kr->>'start_value')::NUMERIC,
                current_value = (v_kr->>'current_value')::NUMERIC,
                target_value = (v_kr->>'target_value')::NUMERIC,
                unit = v_kr->>'unit',
                activity_done = (v_kr->>'activity_done')::BOOLEAN,
                description = v_kr->>'description',
                updated_at = NOW()
            WHERE id = (v_kr->>'id')::UUID;
        ELSE
            INSERT INTO key_results (
                okr_id, title, type, direction, start_value, 
                current_value, target_value, unit, activity_done, description
            ) VALUES (
                v_okr_id,
                v_kr->>'title',
                v_kr->>'type',
                v_kr->>'direction',
                (v_kr->>'start_value')::NUMERIC,
                (v_kr->>'current_value')::NUMERIC,
                (v_kr->>'target_value')::NUMERIC,
                v_kr->>'unit',
                COALESCE((v_kr->>'activity_done')::BOOLEAN, FALSE),
                v_kr->>'description'
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'id', v_okr_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_okr_with_krs TO authenticated;

-- Notificar recarregamento do schema
NOTIFY pgrst, 'reload schema';
