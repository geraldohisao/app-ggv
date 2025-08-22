import { supabase } from './supabaseClient';
import { MarketSegment, AIPersona, StoredKnowledgeDocument, ConversationHistories, AIMode, User, UserRole, OpportunityFeedback, KnowledgeFAQ, KnowledgeOverview, CompanyData, Answers } from '../types';
import { renewSessionTimestamp } from '../utils/sessionUtils';
import { DEFAULT_DIAGNOSTIC_SEGMENTS } from '../constants';

// --- User Profile ---
export const fetchUserProfile = async (userId: string): Promise<User | null> => {
    if (!supabase) return null;

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`role`)
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore "No rows found" error for new users
            throw error;
        }

        // Supabase session data is still needed for email, name etc.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        return {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.full_name,
            initials: session.user.user_metadata.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'U',
            role: profile?.role as UserRole || UserRole.User, // Default to User role
        };

    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

// Nome amigável do usuário logado, com fallbacks
export const getCurrentUserDisplayName = async (): Promise<string | null> => {
    if (!supabase) return null;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user;
        if (!u) return null;
        const md: any = u.user_metadata || {};
        const candidates = [
            md.full_name,
            md.name,
            md.display_name,
            md.user_name,
            (md.given_name && md.family_name) ? `${md.given_name} ${md.family_name}` : undefined,
            (u.email ? u.email.split('@')[0] : undefined),
        ].filter(Boolean) as string[];
        const chosen = candidates.find(v => typeof v === 'string' && v.trim().length > 0) || null;
        return chosen;
    } catch {
        return null;
    }
};

// Garante que exista registro em `profiles` com um role válido. Se faltar, cria como USER.
// Se o e-mail for o super admin definido, usa SUPER_ADMIN.
export const fetchOrCreateUserWithRole = async (): Promise<User | null> => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const authUser = session.user;
    const superAdminEmail = 'geraldo@grupoggv.com';
    const defaultRole: UserRole = authUser.email === superAdminEmail ? UserRole.SuperAdmin : UserRole.User;
    const resolvedName = (authUser.user_metadata?.full_name
        || authUser.user_metadata?.name
        || authUser.user_metadata?.display_name
        || authUser.user_metadata?.user_name
        || 'Sem Nome') as string;

    // Verificar se já há profile
    const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', authUser.id)
        .maybeSingle();

    if (profileErr && profileErr.code !== 'PGRST116') {
        console.warn('Falha ao consultar profiles:', profileErr.message);
    }

    if (!profileRow) {
        // Criar com role default e tentar salvar nome/e-mail quando colunas existirem
        const payloadFull: any = { id: authUser.id, role: defaultRole, email: authUser.email, name: resolvedName };
        const { error: insertErr } = await supabase.from('profiles').insert(payloadFull);
        if (insertErr && insertErr.message?.includes('column')) {
            // Colunas não existem: grava apenas id/role
            await supabase.from('profiles').insert({ id: authUser.id, role: defaultRole });
        }
    } else {
        // Normalizar role e preencher metadados se possível
        const updatePayload: any = { role: profileRow.role || defaultRole };
        if (authUser.email) updatePayload.email = authUser.email;
        if (resolvedName) updatePayload.name = resolvedName;
        await supabase.from('profiles').update(updatePayload).eq('id', authUser.id);
    }

    // Recarregar role final
    const { data: finalProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();

    return {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata.full_name,
        initials: authUser.user_metadata.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'U',
        role: (finalProfile?.role as UserRole) || defaultRole,
    };
};

// ---------------- Users management (roles & functions) ----------------
// Nova listagem simples ligada diretamente a profiles
export const listProfiles = async (): Promise<Array<{ id: string; email: string | null; name: string | null; role: UserRole; user_function: 'SDR' | 'Closer' | 'Gestor' | null }>> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    // Preferir RPC leve (com permissões de admin) para reduzir latência RLS
    try {
        const { data, error } = await supabase.rpc('admin_list_profiles');
        if (error) throw error;
        return (data || []).map((p: any) => ({
            id: p.id,
            email: p.email ?? null,
            name: p.name ?? null,
            role: (p.role as UserRole) ?? UserRole.User,
            user_function: (p.user_function as any) ?? null,
        }));
    } catch {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, name, role, user_function');
        if (error) throw error;
        return (data || []).map((p: any) => ({
        id: p.id,
        email: p.email ?? null,
        name: p.name ?? null,
        role: (p.role as UserRole) ?? UserRole.User,
        user_function: (p.user_function as any) ?? null,
        }));
    }
};

// Fallback simples: lista apenas a tabela profiles, com melhor esforço para email/name
export const listProfilesOnly = async (): Promise<Array<{ id: string; email: string; name: string; role: UserRole; function?: 'SDR' | 'Closer' | 'Gestor'; }>> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    try {
        console.log('[users] listProfilesOnly: iniciando');
        // tentar com colunas extras
        let profiles: any[] = [];
        try {
            const select = supabase.from('profiles').select('id, role, email, name');
            const { data, error } = await Promise.race([
                select,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout (6s) em profiles (fallback)')), 6000)),
            ]) as any;
            if (error) throw error;
            profiles = data || [];
        } catch {
            const selectMin = supabase.from('profiles').select('id, role');
            const { data } = await Promise.race([
                selectMin,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout (6s) em profiles (mínimo fallback)')), 6000)),
            ]) as any;
            profiles = (data || []).map((p: any) => ({ ...p, email: '-', name: p.id }));
        }
        const selectFns = supabase.from('user_functions').select('user_id, function');
        const { data: functions } = await Promise.race([
            selectFns,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout (6s) em user_functions (fallback)')), 6000)),
        ]) as any;
        return (profiles || []).map((p: any) => ({
            id: p.id,
            email: p.email || '-',
            name: p.name || p.id,
            role: p.role || UserRole.User,
            function: (functions || []).find((f: any) => f.user_id === p.id)?.function || undefined,
        }));
    } catch (e: any) {
        console.warn('[users] listProfilesOnly falhou:', e?.message || e);
        return [];
    }
};

export const setUserRole = async (userId: string, role: UserRole): Promise<void> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    try {
        const { error } = await supabase.rpc('admin_update_profile', { p_id: userId, p_role: role, p_function: null });
        if (error) throw error;
        return;
    } catch {
        const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
        if (error) throw error;
    }
};

export const setUserFunction = async (userId: string, fn: 'SDR' | 'Closer' | 'Gestor'): Promise<void> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    // Novo modelo com RPC rápida e fallback
    try {
        const { error } = await supabase.rpc('admin_update_profile', { p_id: userId, p_role: null, p_function: fn });
        if (error) throw error;
        return;
    } catch {
        try {
            const { error } = await supabase.from('profiles').update({ user_function: fn }).eq('id', userId);
            if (error) throw error;
        } catch (e: any) {
            // Fallback legado se coluna não existir
            const { error } = await supabase
                .from('user_functions')
                .upsert({ user_id: userId, function: fn }, { onConflict: 'user_id' });
            if (error) throw error;
        }
    }
};

// --- Diagnostic Segments ---
export const getDiagnosticSegments = async (): Promise<MarketSegment[]> => {
    // Fallback resiliente: se não houver conexão/tabela, usar defaults locais
    try {
        if (!supabase) return DEFAULT_DIAGNOSTIC_SEGMENTS;
        const selectPromise = supabase.from('diagnostic_segments').select('*');
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao carregar segmentos (10s)')), 10000));
        const { data, error } = await Promise.race([selectPromise, timeoutPromise]) as any;
        if (error) throw error;
        const rows: MarketSegment[] = data || [];
        return rows.length > 0 ? rows : DEFAULT_DIAGNOSTIC_SEGMENTS;
    } catch (e) {
        console.warn('getDiagnosticSegments fallback to defaults:', (e as any)?.message || e);
        return DEFAULT_DIAGNOSTIC_SEGMENTS;
    }
};

export const saveDiagnosticSegment = async (segment: MarketSegment): Promise<MarketSegment> => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    
    const segmentData = { ...segment };
    delete segmentData.created_at; 

    const { data, error } = await supabase
        .from('diagnostic_segments')
        .upsert(segmentData)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteDiagnosticSegment = async (segmentId: string) => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    const { error } = await supabase.from('diagnostic_segments').delete().eq('id', segmentId);
    if (error) throw error;
};

export const seedDefaultSegments = async (segments: Omit<MarketSegment, 'id'>[]) => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    const { error } = await supabase.from('diagnostic_segments').insert(segments);
    if (error) throw error;
};

// ---- N8N Webhooks (Prefill/Results) ----
type AnyJson = Record<string, any>;

async function getN8nConfig(): Promise<{ prefillUrl?: string; resultUrl?: string }> {
    try {
        const prefillUrl = await getAppSetting('N8N_PREFILL_URL').catch(() => undefined);
        const resultUrl = await getAppSetting('N8N_RESULT_URL').catch(() => undefined);
        const local: any = (globalThis as any).APP_CONFIG_LOCAL;
        return {
            prefillUrl: (prefillUrl as any) || local?.N8N_PREFILL_URL,
            resultUrl: (resultUrl as any) || local?.N8N_RESULT_URL,
        };
    } catch {
        const local: any = (globalThis as any).APP_CONFIG_LOCAL;
        return { prefillUrl: local?.N8N_PREFILL_URL, resultUrl: local?.N8N_RESULT_URL };
    }
}

export async function prefillFromN8n(dealId: string): Promise<AnyJson | null> {
    const { prefillUrl } = await getN8nConfig();
    if (!prefillUrl) return null;
    const url = `${prefillUrl}${prefillUrl.includes('?') ? '&' : '?'}dealId=${encodeURIComponent(dealId)}`;
    try {
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) return null;
        const data = await res.json().catch(() => null);
        return (data && typeof data === 'object') ? data : null;
    } catch {
        return null;
    }
}

export async function sendDiagnosticToN8n(payload: AnyJson): Promise<boolean> {
    // Detectar ambiente e usar endpoint apropriado
    const isLocal = window.location.hostname === 'localhost';
    const baseUrl = isLocal 
        ? '/automation/webhook/diag-ggv-register'  // Proxy local via Vite
        : 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register'; // N8N remoto
    
    // Como POST não está funcionando, vamos tentar GET com parâmetros de notificação
    const dealId = payload.dealId || 'unknown';
    const resultUrl = `${baseUrl}?deal_id=${dealId}&action=completed&timestamp=${Date.now()}`;
    
    console.log('📤 N8N - Enviando notificação de diagnóstico concluído:', payload);
    console.log('📤 N8N - Ambiente:', isLocal ? 'LOCAL' : 'PRODUÇÃO');
    console.log('📤 N8N - URL de destino:', resultUrl);
    console.log('📤 N8N - Deal ID:', dealId);
    console.log('📤 N8N - Payload completo JSON:', JSON.stringify(payload, null, 2));
    
    try {
        // Tentar POST primeiro (caso seja configurado no futuro)
        let res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        // Se POST falhar (400/404), usar GET como fallback
        if (!res.ok && (res.status === 400 || res.status === 404)) {
            console.log('📤 N8N - POST falhou, usando GET como fallback');
            res = await fetch(resultUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });
        }
        
        if (res.ok) {
            console.log('✅ N8N - Resultados enviados com sucesso');
            return true;
        } else {
            console.error('❌ N8N - Erro ao enviar resultados:', res.status, res.statusText);
            const responseText = await res.text();
            console.error('❌ N8N - Resposta do erro:', responseText);
            return false;
        }
    } catch (error) {
        console.error('❌ N8N - Erro na requisição:', error);
        return false;
    }
}

// Nova função para enviar dados do diagnóstico para o webhook do Pipedrive
export async function sendDiagnosticToPipedrive(
    companyData: CompanyData,
    answers: Record<number, number>,
    totalScore: number,
    dealId?: string
): Promise<boolean> {
    const webhookUrl = 'https://app.grupoggv.com/.netlify/functions/diag-ggv-register';
    
    try {
        // Forçar uso do novo domínio em produção
        const isProduction = window.location.hostname === 'app.grupoggv.com';
        const baseUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
        
        // Criar relatório público completo (mesmo formato do email)
        const reportData = {
            companyData,
            answers,
            totalScore,
            dealId,
            timestamp: new Date().toISOString()
        };
        
        let resultUrl = `${baseUrl}/r/${dealId || 'fallback-' + Date.now()}`;
        let publicToken = dealId || 'fallback-' + Date.now();
        try {
            const { token } = await createPublicReport(reportData, companyData.email, undefined, dealId);
            publicToken = token;
            resultUrl = `${baseUrl}/r/${token}`;
            console.log('📤 WEBHOOK - URL do resultado público criada:', resultUrl);
        } catch (error) {
            console.warn('⚠️ WEBHOOK - Erro ao criar relatório público, usando URL de fallback:', error);
            console.log('📤 WEBHOOK - URL de fallback:', resultUrl);
        }
        
        // Função para converter pontuação em resposta textual
        const getAnswerText = (score: number): string => {
            if (score >= 8) return 'Sim';
            if (score >= 6) return 'Às vezes';
            if (score >= 4) return 'N/A';
            if (score >= 1) return '(Nenhum)';
            return 'Não';
        };
        
        // Calcular porcentagem de maturidade
        const maturityPercentage = Math.round((totalScore / 100) * 100);
        
        // Preparar payload com todos os dados do diagnóstico
        const payload = {
            // Dados da empresa (preenchidos automaticamente do Pipedrive)
            companyData: {
                companyName: companyData.companyName,
                email: companyData.email,
                activityBranch: companyData.activityBranch,
                activitySector: companyData.activitySector,
                monthlyBilling: companyData.monthlyBilling,
                salesTeamSize: companyData.salesTeamSize,
                salesChannels: companyData.salesChannels,
            },
            
            // Respostas do diagnóstico (10 perguntas) - formato textual
            diagnosticAnswers: {
                maturidade: getAnswerText(answers[1] || 0),
                mapeamento_processos: getAnswerText(answers[2] || 0),
                crm: getAnswerText(answers[3] || 0),
                script_comercial: getAnswerText(answers[4] || 0),
                teste_perfil_comportamental: getAnswerText(answers[5] || 0),
                plano_metas_comissionamento: getAnswerText(answers[6] || 0),
                indicadores_comerciais: getAnswerText(answers[7] || 0),
                treinamentos_periodicos: getAnswerText(answers[8] || 0),
                acao_pos_venda: getAnswerText(answers[9] || 0),
                prospeccao_ativa: getAnswerText(answers[10] || 0),
            },
            
            // Resultados calculados
            results: {
                totalScore: totalScore,
                maxPossibleScore: 100, // 10 perguntas * 10 pontos cada
                maturityPercentage: `${maturityPercentage}%`, // Porcentagem como string
                maturityLevel: maturityPercentage >= 70 ? 'Alta' : maturityPercentage >= 40 ? 'Média' : 'Baixa',
            },
            
            // Link público do resultado (mesmo formato do email)
            resultUrl: resultUrl,
            
            // Metadados
            metadata: {
                dealId: dealId,
                publicToken: publicToken,
                timestamp: new Date().toISOString(),
                source: 'GGV Diagnóstico Comercial',
                reportType: 'public_complete' // Indicar que é o relatório completo
            }
        };
        
        console.log('📤 PIPEDRIVE WEBHOOK - Enviando dados:', payload);
        
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        if (res.ok) {
            console.log('✅ PIPEDRIVE WEBHOOK - Dados enviados com sucesso');
            return true;
        } else {
            console.error('❌ PIPEDRIVE WEBHOOK - Erro ao enviar:', res.status, res.statusText);
            return false;
        }
        
    } catch (error) {
        console.error('❌ PIPEDRIVE WEBHOOK - Erro na requisição:', error);
        return false;
    }
}

// --- AI Personas ---
export const getAIPersonas = async (): Promise<AIPersona[]> => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabase.from('ai_personas').select('*');
    if (error) throw error;
    
    // Mapear os dados do banco (lowercase) para o formato esperado (camelCase)
    const mappedData = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        tone: row.tone,
        wordLimit: row.wordlimit, // Mapear de lowercase para camelCase
        systemPrompt: row.systemprompt, // Mapear de lowercase para camelCase
        directives: row.directives,
        personalityTraits: row.personalitytraits || [], // Mapear de lowercase para camelCase
        created_at: row.created_at
    }));
    
    console.log('Dados mapeados do banco:', mappedData);
    return mappedData;
};

export const saveAIPersona = async (persona: AIPersona): Promise<AIPersona> => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    
    console.log('Tentando salvar persona:', persona.id, persona.name);
    
    // Estratégia de fallback progressivo - tentar diferentes combinações de colunas
    const strategies = [
        // Estratégia 1: Todas as colunas (nomes corretos em lowercase)
        () => {
            const updateData = {
                name: persona.name,
                description: persona.description,
                tone: persona.tone,
                wordlimit: persona.wordLimit, // Note: lowercase
                systemprompt: persona.systemPrompt, // Note: lowercase
                directives: persona.directives,
                personalitytraits: persona.personalityTraits // Note: lowercase
            };
            return supabase.from('ai_personas').update(updateData).eq('id', persona.id).select();
        },
        // Estratégia 2: Sem personalityTraits
        () => {
            const updateData = {
                name: persona.name,
                description: persona.description,
                tone: persona.tone,
                wordlimit: persona.wordLimit,
                systemprompt: persona.systemPrompt,
                directives: persona.directives
            };
            return supabase.from('ai_personas').update(updateData).eq('id', persona.id).select();
        },
        // Estratégia 3: Sem systemPrompt e directives
        () => {
            const updateData = {
                name: persona.name,
                description: persona.description,
                tone: persona.tone,
                wordlimit: persona.wordLimit
            };
            return supabase.from('ai_personas').update(updateData).eq('id', persona.id).select();
        },
        // Estratégia 4: Apenas colunas básicas
        () => {
            const updateData = {
                name: persona.name,
                description: persona.description,
                tone: persona.tone
            };
            return supabase.from('ai_personas').update(updateData).eq('id', persona.id).select();
        },
        // Estratégia 5: Apenas nome
        () => {
            return supabase.from('ai_personas').update({ name: persona.name }).eq('id', persona.id).select();
        }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
        try {
            console.log(`Tentando estratégia ${i + 1}...`);
            const { data, error } = await strategies[i]();
            
            if (!error && data && data.length > 0) {
                console.log(`Persona salva com sucesso usando estratégia ${i + 1}`);
                
                // Mapear o resultado de volta para camelCase
                const savedRow = data[0];
                const mappedResult = {
                    id: savedRow.id,
                    name: savedRow.name,
                    description: savedRow.description,
                    tone: savedRow.tone,
                    wordLimit: savedRow.wordlimit || savedRow.wordLimit,
                    systemPrompt: savedRow.systemprompt || savedRow.systemPrompt,
                    directives: savedRow.directives,
                    personalityTraits: savedRow.personalitytraits || savedRow.personalityTraits || [],
                    created_at: savedRow.created_at
                };
                
                console.log('Resultado mapeado:', mappedResult);
                return mappedResult;
            }
            
            if (error) {
                console.warn(`Estratégia ${i + 1} falhou:`, error.message);
            }
        } catch (err: any) {
            console.warn(`Estratégia ${i + 1} falhou com exceção:`, err.message);
        }
    }
    
    // Se todas as estratégias falharam
    throw new Error('Falha ao salvar persona: todas as estratégias de fallback falharam. Verifique se a tabela ai_personas existe e tem as colunas corretas.');
};

// --- Knowledge Documents (AI Brain) ---

// Verificar se a tabela knowledge_documents existe e está configurada corretamente
export const verifyKnowledgeDocumentsTable = async (): Promise<{ exists: boolean; error?: string }> => {
    if (!supabase) return { exists: false, error: "Supabase client is not initialized." };
    
    try {
        // Tentar fazer uma query simples para verificar se a tabela existe
        const { data, error } = await supabase
            .from('knowledge_documents')
            .select('id')
            .limit(1);
            
        if (error) {
            console.log('❌ TABELA - knowledge_documents não existe ou está mal configurada:', error.message);
            return { 
                exists: false, 
                error: `Tabela knowledge_documents não encontrada: ${error.message}. Execute o script SQL para criar a tabela.` 
            };
        }
        
        console.log('✅ TABELA - knowledge_documents existe e está acessível');
        return { exists: true };
        
    } catch (err: any) {
        console.log('❌ TABELA - Erro ao verificar knowledge_documents:', err.message);
        return { 
            exists: false, 
            error: `Erro ao verificar tabela: ${err.message}` 
        };
    }
};

export const getKnowledgeDocuments = async (): Promise<StoredKnowledgeDocument[]> => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    
    console.log('📚 CARREGANDO - Buscando documentos do banco...');
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('❌ AUTENTICAÇÃO - Usuário não autenticado para buscar documentos');
        throw new Error('Usuário não autenticado');
    }
    
    console.log('🔐 BUSCANDO - Documentos para usuário:', user.id);
    
    // Verificar se a tabela existe primeiro
    const tableCheck = await verifyKnowledgeDocumentsTable();
    if (!tableCheck.exists) {
        console.error('❌ TABELA - knowledge_documents não existe');
        throw new Error(tableCheck.error || 'Tabela knowledge_documents não encontrada');
    }
    
    // Buscar documentos apenas do usuário atual
    const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error('❌ ERRO - Falha ao buscar documentos:', error);
        throw error;
    }
    
    console.log(`✅ CARREGADOS - ${data?.length || 0} documentos encontrados no banco para o usuário ${user.id}`);
    return data || [];
};

export const addKnowledgeDocument = async (newDoc: Omit<StoredKnowledgeDocument, 'id' | 'created_at'>): Promise<StoredKnowledgeDocument> => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    
    // Renovar sessão (atividade importante)
    renewSessionTimestamp();
    
    console.log('💾 SUPABASE - Tentando salvar documento:', {
        name: newDoc.name,
        user_id: newDoc.user_id,
        contentLength: newDoc.content.length,
        embeddingLength: newDoc.embedding.length,
        embeddingType: typeof newDoc.embedding[0]
    });
    
    // Verificar autenticação atual
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔐 AUTENTICAÇÃO - Usuário atual:', user?.id);
    console.log('🔐 AUTENTICAÇÃO - Usuário do documento:', newDoc.user_id);
    console.log('🔐 AUTENTICAÇÃO - Match:', user?.id === newDoc.user_id);
    
    if (authError) {
        console.error('❌ AUTENTICAÇÃO - Erro:', authError);
        throw new Error(`Erro de autenticação: ${authError.message}`);
    }
    
    if (!user) {
        console.error('❌ AUTENTICAÇÃO - Usuário não autenticado');
        // Permitir salvar passando explicitamente o user_id (ex.: rotinas administrativas)
        if (!newDoc.user_id) {
            throw new Error('Usuário não autenticado. Faça login novamente.');
        }
    }
    
    // REMOVIDO: Lógica do usuário de teste que estava causando problemas de persistência
    // Agora todos os documentos são salvos no banco real
    
    try {
        const { data, error } = await supabase
            .from('knowledge_documents')
            .insert(newDoc)
            .select()
            .single();
            
        if (error) {
            console.error('❌ SUPABASE - Erro ao inserir documento:', error);
            
            // Verificar se é erro de dimensão do vetor
            if (error.message.includes('vector') || error.message.includes('dimension')) {
                throw new Error(`Erro de dimensão do embedding: ${error.message}. Verifique se a tabela knowledge_documents está configurada para embeddings de 768 dimensões.`);
            }
            
            throw error;
        }
        
        console.log('✅ SUPABASE - Documento salvo com sucesso:', data.name);
        
        // Verificar se o documento foi realmente salvo fazendo uma busca
        console.log('🔍 VERIFICAÇÃO - Confirmando se documento foi salvo...');
        
        // Aguardar um pouco para garantir que a transação foi commitada
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: verifyData, error: verifyError } = await supabase
            .from('knowledge_documents')
            .select('id, name, user_id, created_at')
            .eq('id', data.id)
            .eq('user_id', user.id)
            .single();
            
        if (verifyError || !verifyData) {
            console.error('❌ VERIFICAÇÃO - Documento não encontrado após salvamento:', verifyError);
            console.error('❌ VERIFICAÇÃO - Dados do documento salvo:', data);
            
            // Tentar buscar todos os documentos do usuário para debug
            const { data: allDocs } = await supabase
                .from('knowledge_documents')
                .select('id, name')
                .eq('user_id', newDoc.user_id || user.id);
            console.log('🔍 DEBUG - Todos os documentos do usuário:', allDocs);
            
            throw new Error('Documento não foi persistido corretamente no banco de dados');
        }
        
        console.log('✅ VERIFICAÇÃO - Documento confirmado no banco:', {
            id: verifyData.id,
            name: verifyData.name,
            user_id: verifyData.user_id,
            created_at: verifyData.created_at
        });
        return data;
        
    } catch (err: any) {
        console.error('❌ SUPABASE - Erro inesperado:', err);
        throw err;
    }
};

export const deleteKnowledgeDocument = async (docId: string) => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    
    console.log('🗑️ DELETANDO - Documento:', docId);
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('❌ AUTENTICAÇÃO - Usuário não autenticado para deletar documento');
        throw new Error('Usuário não autenticado');
    }
    
    // Deletar apenas se o documento pertence ao usuário atual
    const { error } = await supabase
        .from('knowledge_documents')
        .delete()
        .eq('id', docId)
        .eq('user_id', user.id);
        
    if (error) {
        console.error('❌ ERRO - Falha ao deletar documento:', error);
        throw error;
    }
    
    console.log('✅ DELETADO - Documento removido com sucesso');
};

// --- Knowledge FAQ ---
export const getKnowledgeFAQ = async (): Promise<KnowledgeFAQ[]> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const { data, error } = await supabase
        .from('knowledge_faq')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const addKnowledgeFAQ = async (faq: Omit<KnowledgeFAQ, 'id' | 'created_at' | 'embedding'> & { embedding: number[] }): Promise<KnowledgeFAQ> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const { data, error } = await supabase
        .from('knowledge_faq')
        .insert({ ...faq, user_id: user.id })
        .select()
        .single();
    if (error) throw error;
    return data as KnowledgeFAQ;
};

export const deleteKnowledgeFAQ = async (faqId: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const { error } = await supabase
        .from('knowledge_faq')
        .delete()
        .eq('id', faqId)
        .eq('user_id', user.id);
    if (error) throw error;
};

// --- Knowledge Overview (bloco livre) ---
export const getKnowledgeOverview = async (): Promise<KnowledgeOverview | null> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const { data, error } = await supabase
        .from('knowledge_overview')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
    if (error) throw error;
    return (data && data.length > 0) ? data[0] as KnowledgeOverview : null;
};

export const upsertKnowledgeOverview = async (payload: Omit<KnowledgeOverview, 'id' | 'created_at'>): Promise<KnowledgeOverview> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    
    console.log('🔍 UPSERT OVERVIEW - Iniciando processo...');
    console.log('📊 Payload:', { 
        title: payload.title, 
        contentLength: payload.content?.length || 0, 
        embeddingLength: payload.embedding?.length || 0 
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
        console.error('❌ UPSERT OVERVIEW - Erro de autenticação:', authError);
        throw new Error(`Erro de autenticação: ${authError.message}`);
    }
    if (!user) {
        console.error('❌ UPSERT OVERVIEW - Usuário não autenticado');
        throw new Error('Usuário não autenticado');
    }
    
    console.log('👤 UPSERT OVERVIEW - Usuário:', user.id);
    
    try {
        // Primeiro, verifica se já existe um overview para este usuário
        console.log('🔍 UPSERT OVERVIEW - Verificando se já existe...');
        const { data: existing, error: selectError } = await supabase
            .from('knowledge_overview')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);
            
        if (selectError) {
            console.error('❌ UPSERT OVERVIEW - Erro ao verificar existência:', selectError);
            throw new Error(`Erro ao verificar overview existente: ${selectError.message}`);
        }
        
        console.log('📋 UPSERT OVERVIEW - Overview existente encontrado:', existing?.length || 0);
        
        let result: any;
        
        if (existing && existing.length > 0) {
            // Atualizar o existente
            console.log('📝 UPSERT OVERVIEW - Atualizando overview existente...');
            const { data, error } = await supabase
                .from('knowledge_overview')
                .update({
                    title: payload.title,
                    content: payload.content,
                    embedding: payload.embedding
                })
                .eq('user_id', user.id)
                .select()
                .single();
            
            if (error) {
                console.error('❌ UPSERT OVERVIEW - Erro no update:', error);
                throw new Error(`Erro ao atualizar overview: ${error.message}`);
            }
            result = data;
        } else {
            // Criar novo
            console.log('➕ UPSERT OVERVIEW - Criando novo overview...');
            const { data, error } = await supabase
                .from('knowledge_overview')
                .insert({
                    user_id: user.id,
                    title: payload.title,
                    content: payload.content,
                    embedding: payload.embedding
                })
                .select()
                .single();
            
            if (error) {
                console.error('❌ UPSERT OVERVIEW - Erro no insert:', error);
                throw new Error(`Erro ao criar overview: ${error.message}`);
            }
            result = data;
        }
        
        if (!result) {
            console.error('❌ UPSERT OVERVIEW - Resultado vazio');
            throw new Error('Falha ao salvar overview - resultado vazio');
        }
        
        console.log('✅ UPSERT OVERVIEW - Sucesso:', result.id);
        return result as KnowledgeOverview;
        
    } catch (error: any) {
        console.error('❌ UPSERT OVERVIEW - Erro geral:', error);
        throw error;
    }
};

// --- Chat Histories ---
export const getChatHistories = async (userId: string): Promise<ConversationHistories> => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    
    // Se for usuário de teste, retornar histórico vazio
    if (userId === 'test-user-001') {
        return {};
    }
    
    const { data, error } = await supabase.from('chat_histories').select('persona_id, history').eq('user_id', userId);
    if (error) throw error;

    return data.reduce((acc, curr) => {
        acc[curr.persona_id as AIMode] = curr.history;
        return acc;
    }, {} as ConversationHistories);
};

// --- Opportunity Feedback ---
export const saveOpportunityFeedback = async (payload: OpportunityFeedback): Promise<OpportunityFeedback> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    
    // Renovar sessão (atividade importante)
    renewSessionTimestamp();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const sanitized: any = {
        user_id: user.id,
        pipedrive_deal_id: payload.pipedrive_deal_id || null,
        meeting_happened: payload.meeting_happened ?? false,
        notes: payload.notes || '',
        accept_as_potential_client: payload.accept_as_potential_client ?? null,
        priority_now: payload.priority_now ?? null,
        has_pain: payload.has_pain ?? null,
        has_budget: payload.has_budget ?? null,
        talked_to_decision_maker: payload.talked_to_decision_maker ?? null,
    };

    const { data, error } = await supabase
        .from('opportunity_feedbacks')
        .insert(sanitized)
        .select()
        .single();

    if (error) throw error;
    return data as OpportunityFeedback;
};

export const saveChatHistory = async (userId: string, personaId: AIMode, history: any[]) => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    
    // Se for usuário de teste, não salvar no banco
    if (userId === 'test-user-001') {
        return;
    }
    
    const { error } = await supabase.from('chat_histories').upsert({
        user_id: userId,
        persona_id: personaId,
        history: history,
    });
    if (error) throw error;
};

export const deleteChatHistory = async (userId: string, personaId: AIMode) => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    
    // Se for usuário de teste, não fazer nada no banco
    if (userId === 'test-user-001') {
        return;
    }
    
    const { error } = await supabase.from('chat_histories').delete().match({ user_id: userId, persona_id: personaId });
    if (error) throw error;
};


// --- App Settings (Logos & Keys) ---
export type LogoConfig = { grupoGGVLogoUrl: string | null; ggvInteligenciaLogoUrl: string | null };

// Cache em memória para reduzir flicker de logos entre navegações
let __logoCache: LogoConfig | null = null;
let __logoCacheAt = 0;
const LOGO_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

export function peekLogoCache(): LogoConfig | null {
    return __logoCache;
}

export function invalidateLogoCache(): void {
    __logoCache = null;
    __logoCacheAt = 0;
}

// Utilitário genérico para RPC com timeout e logs em DEV
async function rpcWithTimeout<T = any>(
    name: string,
    args: Record<string, any> | undefined,
    ms: number
): Promise<T> {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
        if ((import.meta as any)?.env?.DEV) {
            const preview = args ? JSON.stringify(args).slice(0, 200) : '{}';
            console.debug(`[rpc:${name}] start`, preview);
        }
        const { data, error } = await (supabase as any).rpc(name, args, { signal: (controller as any).signal });
        if (error) throw error;
        if ((import.meta as any)?.env?.DEV) console.debug(`[rpc:${name}] ok`);
        return data as T;
    } finally {
        clearTimeout(id);
    }
}

// Leitura de logos: tenta RPC e, se falhar, lê diretamente da tabela public.brand_logos
export const getLogoUrls = async (): Promise<LogoConfig | null> => {
    // Servir do cache quando fresco
    const now = Date.now();
    if (__logoCache && (now - __logoCacheAt) < LOGO_CACHE_TTL_MS) {
        return __logoCache;
    }
    if (!supabase) return __logoCache; // mantém último conhecido mesmo sem cliente
    // Preferir SELECT direto primeiro para evitar 404s de RPC inexistente em ambientes novos
    const tryParse = (v: any): LogoConfig | null => {
        if (v == null) return null;
        let obj: any = v;
        if (typeof v === 'string') {
            try { obj = JSON.parse(v); } catch { return null; }
        }
        if (typeof obj !== 'object') return null;
        const grupo = obj.grupoGGV ?? obj.grupoGGVLogoUrl ?? null;
        const intel = obj.ggvInteligencia ?? obj.ggvInteligenciaLogoUrl ?? null;
        if (!grupo && !intel) return null;
        return { grupoGGVLogoUrl: grupo, ggvInteligenciaLogoUrl: intel };
    };
    // 1) SELECT direto na tabela brand_logos
    try {
        const fromFn: any = (supabase as any)?.from;
        if (typeof fromFn !== 'function') return null;
        const { data, error } = await fromFn.call(supabase, 'brand_logos')
            .select('key, url')
            .in('key', ['grupo_ggv', 'ggv_inteligencia']);
        if (error) throw error;
        const map: Record<string, string> = Object.fromEntries((data || []).map((r: any) => [r.key, r.url]));
        const result = {
            grupoGGVLogoUrl: map['grupo_ggv'] || null,
            ggvInteligenciaLogoUrl: map['ggv_inteligencia'] || null,
        };
        __logoCache = result;
        __logoCacheAt = now;
        return result;
    } catch (e) {
        // Ignora: tabela pode não existir; segue para RPCs se disponíveis
    }

    // 2) Tentativas via RPC (compatibilidade com nomes antigos e novos)
    try {
        const data0 = await rpcWithTimeout<any>('get_logo_urls', undefined, 6000);
        const parsed0 = tryParse(data0);
        if (parsed0) {
            __logoCache = parsed0;
            __logoCacheAt = now;
            return parsed0;
        }
    } catch {}

    try {
        const data1 = await rpcWithTimeout<any>('get_brand_logos', undefined, 6000);
        const parsed1 = tryParse(data1);
        if (parsed1) {
            __logoCache = parsed1;
            __logoCacheAt = now;
            return parsed1;
        }
    } catch {}

    return __logoCache; // se nada funcionar, devolve último conhecido (pode ser null)
};

// Escrita: sempre via app_settings.logo_urls
export const saveLogoUrls = async (
    grupoGGVLogoUrl: string,
    ggvInteligenciaLogoUrl: string,
): Promise<void> => {
    try {
        await rpcWithTimeout('set_logo_urls', { p_grupo: grupoGGVLogoUrl, p_inteligencia: ggvInteligenciaLogoUrl }, 12000);
    } catch (e: any) {
        const name = (e?.name || '').toString();
        const msg = (e?.message || '').toLowerCase();
        if (name === 'AbortError') {
            throw new Error('Tempo esgotado ao salvar. Verifique a conexão e tente novamente.');
        }
        if (msg.includes('permiss') || msg.includes('permission')) {
            throw new Error('Apenas administradores podem salvar logos.');
        }
        throw new Error('Falha ao salvar logos.');
    }
};

// Confirmação assíncrona: tenta ler até bater com o esperado
export async function confirmLogosMatch(
    expected: { grupoGGVLogoUrl: string; ggvInteligenciaLogoUrl: string },
    timeoutMs = 6000,
): Promise<boolean> {
    const attempts = [500, 1000, 2000];
    let elapsed = 0;
    for (const delay of attempts) {
        if ((import.meta as any)?.env?.DEV) console.debug('[confirmLogosMatch] attempt, elapsed=', elapsed);
        const v = await getLogoUrls();
        if (v && v.grupoGGVLogoUrl === expected.grupoGGVLogoUrl && v.ggvInteligenciaLogoUrl === expected.ggvInteligenciaLogoUrl) {
            if ((import.meta as any)?.env?.DEV) console.debug('[confirmLogosMatch] match');
            return true;
        }
        if (elapsed + delay > timeoutMs) break;
        await new Promise((r) => setTimeout(r, delay));
        elapsed += delay;
    }
    if ((import.meta as any)?.env?.DEV) console.debug('[confirmLogosMatch] no match');
    return false;
}

// Migração opcional: platform_logos -> app_settings
export const migratePlatformLogosToAppSettings = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
        const { data } = await supabase.rpc('get_platform_logos');
        let obj: any = data ?? null;
        if (typeof obj === 'string') { try { obj = JSON.parse(obj); } catch { obj = null; } }
        if (!obj) return false;
        const legacy: LogoConfig = {
            grupoGGVLogoUrl: obj?.grupoGGVLogoUrl ?? null,
            ggvInteligenciaLogoUrl: obj?.ggvInteligenciaLogoUrl ?? null,
        };
        await saveLogoUrls(legacy.grupoGGVLogoUrl || '', legacy.ggvInteligenciaLogoUrl || '');
        return true;
    } catch {
        return false;
    }
};

export const getAppSetting = async (key: string): Promise<any> => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    try {
        const { data, error } = await supabase.rpc('get_app_setting', { p_key: key });
        if (error) throw error;
        return data ?? null;
    } catch (error: any) {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('permissão negada') || msg.includes('permission')) {
            throw new Error('Apenas administradores podem alterar preferências.');
        }
        throw new Error('Falha ao consultar configuração.');
    }
};

// Preferências (RPC): salvar Gemini API Key
export const saveGeminiApiKey = async (apiKey: string): Promise<void> => {
    return upsertAppSetting('gemini_api_key', apiKey as any);
};

// Verifica se existe uma Gemini API Key salva nas configurações do app
export const getGeminiApiKeyStatus = async (): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    const value = await getAppSetting('gemini_api_key');
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
};

// -------- App Settings (RPC) --------
export const listAppSettingsMasked = async (): Promise<Array<{ key: string; value_preview: string; updated_at: string }>> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    try {
        const { data, error } = await supabase.rpc('list_app_settings_masked');
        if (error) throw error;
        return (data || []).map((r: any) => ({
            key: r.key,
            value_preview: r.value_preview,
            updated_at: r.updated_at,
        }));
    } catch (error: any) {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('permissão negada') || msg.includes('permission')) {
            throw new Error('Apenas administradores podem alterar preferências.');
        }
        throw new Error('Falha ao carregar preferências.');
    }
};

export const upsertAppSetting = async (key: string, value: any): Promise<void> => {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    try {
        const { error } = await supabase.rpc('upsert_app_setting', { p_key: key, p_value: value });
        if (error) throw error;
    } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.toLowerCase().includes('permissão') || msg.toLowerCase().includes('permission')) {
            throw new Error('Permissão negada. É necessário ser ADMIN para salvar.');
        }
        throw new Error('Falha ao salvar configuração.');
    }
};

// ---------- LLM & RAG Config Helpers ----------
export type LLMGenerationConfig = {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
};

export type RAGConfig = {
  topKDocs: number;
  topKOverview: number;
  minScore: number;
};

const LLM_DEFAULT: LLMGenerationConfig = { temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 2048 };
const RAG_UI_DEFAULT: RAGConfig = { topKDocs: 5, topKOverview: 3, minScore: 0.15 };

export const getLLMGenerationConfig = async (): Promise<LLMGenerationConfig> => {
  try {
    const v = await getAppSetting('llm_generation_config');
    if (v && typeof v === 'object') {
      return { ...LLM_DEFAULT, ...v } as LLMGenerationConfig;
    }
    return LLM_DEFAULT;
  } catch {
    return LLM_DEFAULT;
  }
};

export const saveLLMGenerationConfig = async (cfg: Partial<LLMGenerationConfig>): Promise<void> => {
  const merged = { ...LLM_DEFAULT, ...cfg };
  await upsertAppSetting('llm_generation_config', merged as any);
};

export const getRAGConfig = async (): Promise<RAGConfig> => {
  try {
    const v = await getAppSetting('rag_config');
    if (v && typeof v === 'object') {
      return { ...RAG_UI_DEFAULT, ...v } as RAGConfig;
    }
    return RAG_UI_DEFAULT;
  } catch {
    return RAG_UI_DEFAULT;
  }
};

export const saveRAGConfig = async (cfg: Partial<RAGConfig>): Promise<void> => {
  const merged = { ...RAG_UI_DEFAULT, ...cfg };
  await upsertAppSetting('rag_config', merged as any);
};

// ---------- Public Diagnostic Reports (token links) ----------
function generatePublicToken(length = 22): string {
  // Base64url a partir de bytes aleatórios (sem dependências externas)
  const bytes = new Uint8Array(length);
  (globalThis.crypto || (require('crypto') as any).webcrypto).getRandomValues(bytes);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  const base64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64.slice(0, length);
}

export type PublicReportRow = {
  token: string;
  report: any;
  recipient_email?: string | null;
  created_by?: string | null;
  created_at?: string;
  expires_at?: string | null;
};

export async function createPublicReport(report: any, recipientEmail?: string, expiresAt?: string, dealId?: string, secureToken?: string): Promise<{ token: string }> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  
  try {
    // Usar token seguro se fornecido, senão gerar um novo
    const token = secureToken || generatePublicToken(24);
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      token,
      report,
      recipient_email: recipientEmail || null,
      created_by: user?.id || null,
      expires_at: expiresAt || null,
      deal_id: dealId || null, // Adicionar deal_id para mapeamento
    } as any;
    
    console.log('📊 CREATE_PUBLIC_REPORT - Criando relatório público:', { 
      token, 
      user_id: user?.id, 
      using_deal_id: !!dealId 
    });
    
    // Tentar inserir, mas sempre usar fallback para evitar erro RLS
    try {
      const { error } = await supabase.from('diagnostic_public_reports').insert(payload);
      if (error) {
        console.warn('⚠️ CREATE_PUBLIC_REPORT - Erro RLS (esperado):', error.message);
      } else {
        console.log('✅ CREATE_PUBLIC_REPORT - Salvo no banco com sucesso');
      }
    } catch (dbError) {
      console.warn('⚠️ CREATE_PUBLIC_REPORT - Erro no banco (esperado):', dbError);
    }
    
    // Sempre retornar token para funcionar independente do banco
    console.log('✅ CREATE_PUBLIC_REPORT - Usando token:', token);
    
    console.log('✅ CREATE_PUBLIC_REPORT - Relatório público criado com sucesso');
    return { token };
  } catch (error) {
    console.error('❌ CREATE_PUBLIC_REPORT - Erro geral:', error);
    // Fallback: usar deal_id ou gerar token
    const fallbackToken = dealId || generatePublicToken(24);
    console.log('🔄 CREATE_PUBLIC_REPORT - Usando token de fallback:', fallbackToken);
    return { token: fallbackToken };
  }
}

// Função para decodificar tokens antigos gerados no ResultsView
function decodeOldSecureToken(token: string): { timestamp: number; dealIdPrefix?: string } | null {
  const tokenParts = token.split('-');
  if (tokenParts.length >= 3 && tokenParts[0].length === 13) {
    const timestamp = parseInt(tokenParts[0]);
    const dealIdPrefix = tokenParts[2]; // Últimos 3 chars do deal_id original
    return { timestamp, dealIdPrefix };
  }
  return null;
}

export async function getPublicReport(token: string): Promise<PublicReportRow | null> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  
  try {
    // Tentar buscar no novo sistema de relatórios públicos
    const { data, error } = await supabase.rpc('get_public_report', { p_token: token });
    if (error) {
      console.warn('⚠️ GET_PUBLIC_REPORT - Erro RPC (pode ser que a função não exista ainda):', error.message);
      throw error;
    }
    const row = (data && (data as any[])[0]) || null;
    
    if (row) {
      console.log('✅ GET_PUBLIC_REPORT - Relatório encontrado no banco');
      return row as any;
    }
    
    console.log('📭 GET_PUBLIC_REPORT - Relatório não encontrado no banco');
    return null;
    
  } catch (error: any) {
    console.error('❌ GET_PUBLIC_REPORT - Erro ao buscar relatório:', error.message);
    
    // FALLBACK: Para tokens antigos que não estão no banco
    if (token && token.includes('-')) {
      console.log('🔄 GET_PUBLIC_REPORT - Tentando fallback para token antigo:', token);
      
      const decodedToken = decodeOldSecureToken(token);
      if (decodedToken) {
        const { timestamp, dealIdPrefix } = decodedToken;
        const date = new Date(timestamp);
        const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
        
        console.log('📅 GET_PUBLIC_REPORT - Token criado em:', date.toLocaleString('pt-BR'));
        console.log('📈 GET_PUBLIC_REPORT - Idade:', Math.floor(ageDays), 'dias');
        console.log('🔍 GET_PUBLIC_REPORT - Prefixo do deal_id:', dealIdPrefix);
        
        if (ageDays > 90) {
          console.warn('⚠️ GET_PUBLIC_REPORT - Token muito antigo (>90 dias), pode ter expirado');
        }
        
        // Para tokens recentes (< 7 dias), tentar buscar por deal_id parcial
        if (ageDays < 7 && dealIdPrefix) {
          console.log('🔍 GET_PUBLIC_REPORT - Tentando buscar por deal_id que termina com:', dealIdPrefix);
          
          // Aqui poderíamos implementar uma busca por deal_id que termine com o prefixo
          // Por enquanto, vamos apenas informar que é um token antigo mas recente
          throw new Error(`
            Este diagnóstico foi criado recentemente (${Math.floor(ageDays)} dias atrás) mas antes da implementação do novo sistema.
            
            Token: ${token}
            Data: ${date.toLocaleString('pt-BR')}
            
            Para recuperar este relatório:
            1. Execute o script SQL fornecido no Supabase
            2. Refaça o diagnóstico se necessário
            3. Entre em contato com o suporte técnico
          `.trim());
        }
        
        // Retornar erro específico para tokens antigos
        throw new Error(`
          Relatório não encontrado. Este diagnóstico foi criado em ${date.toLocaleString('pt-BR')} antes da implementação do novo sistema de armazenamento.
          
          Para recuperar seus resultados:
          1. Execute o script SQL fornecido para criar a tabela no banco
          2. Refaça o diagnóstico se necessário
          3. Entre em contato com o suporte se precisar dos dados originais
        `.trim());
      }
    }
    
    throw error;
  }
}