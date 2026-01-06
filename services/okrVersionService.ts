import { supabase } from './supabaseClient';
import { StrategicMap } from '../types';

export interface MapVersion {
  id: string;
  map_id: string;
  user_id: string;
  version_number: number;
  snapshot: StrategicMap;
  change_summary?: string;
  created_by_name?: string;
  created_at: string;
}

export interface SharePermission {
  id?: string;
  map_id: string;
  owner_id: string;
  shared_with_id: string;
  shared_with_email?: string;
  shared_with_name?: string;
  permission: 'viewer' | 'editor';
  created_at?: string;
}

/**
 * Lista versões de um mapa estratégico
 */
export const listMapVersions = async (mapId: string): Promise<MapVersion[]> => {
  try {
    const { data, error } = await supabase
      .from('strategic_maps_history')
      .select('*')
      .eq('map_id', mapId)
      .order('version_number', { ascending: false });

    if (error) throw error;

    return data as MapVersion[];
  } catch (error) {
    console.error('❌ Erro ao listar versões:', error);
    throw error;
  }
};

/**
 * Obtém uma versão específica
 */
export const getMapVersion = async (versionId: string): Promise<MapVersion | null> => {
  try {
    const { data, error } = await supabase
      .from('strategic_maps_history')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;

    return data as MapVersion;
  } catch (error) {
    console.error('❌ Erro ao obter versão:', error);
    throw error;
  }
};

/**
 * Restaura uma versão anterior
 */
export const restoreMapVersion = async (
  mapId: string,
  versionId: string,
  userId: string
): Promise<void> => {
  try {
    const version = await getMapVersion(versionId);
    if (!version) throw new Error('Versão não encontrada');

    const snapshot = version.snapshot;
    const { error } = await supabase
      .from('strategic_maps')
      .update({
        company_name: snapshot.company_name,
        date: snapshot.date,
        mission: snapshot.mission,
        vision: snapshot.vision,
        values: snapshot.values,
        motors: snapshot.motors,
        objectives: snapshot.objectives,
        action_plans: snapshot.actionPlans,
        roles: snapshot.roles,
        rituals: snapshot.rituals,
        tracking: snapshot.tracking
      })
      .eq('id', mapId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log('✅ Versão restaurada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao restaurar versão:', error);
    throw error;
  }
};

/**
 * Compartilha OKR com outro usuário
 */
export const shareMap = async (
  mapId: string,
  ownerEmail: string,
  targetEmail: string,
  permission: 'viewer' | 'editor'
): Promise<void> => {
  try {
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('email', targetEmail)
      .single();

    if (userError || !targetUser) {
      throw new Error('Usuário não encontrado. Verifique o e-mail.');
    }

    const { data: ownerUser, error: ownerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', ownerEmail)
      .single();

    if (ownerError || !ownerUser) {
      throw new Error('Owner não encontrado.');
    }

    const { error: shareError } = await supabase
      .from('strategic_maps_shares')
      .upsert({
        map_id: mapId,
        owner_id: ownerUser.id,
        shared_with_id: targetUser.id,
        permission: permission
      }, {
        onConflict: 'map_id,shared_with_id'
      });

    if (shareError) throw shareError;

    console.log(`✅ OKR compartilhado com ${targetEmail} (${permission})`);
  } catch (error) {
    console.error('❌ Erro ao compartilhar:', error);
    throw error;
  }
};

/**
 * Lista compartilhamentos de um mapa
 */
export const listMapShares = async (mapId: string): Promise<SharePermission[]> => {
  try {
    const { data, error } = await supabase
      .from('strategic_maps_shares')
      .select(`
        *,
        profiles:shared_with_id (
          email,
          name
        )
      `)
      .eq('map_id', mapId);

    if (error) throw error;

    return data.map((share: any) => ({
      ...share,
      shared_with_email: share.profiles?.email,
      shared_with_name: share.profiles?.name
    })) as SharePermission[];
  } catch (error) {
    console.error('❌ Erro ao listar compartilhamentos:', error);
    throw error;
  }
};

/**
 * Remove compartilhamento
 */
export const removeShare = async (shareId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('strategic_maps_shares')
      .delete()
      .eq('id', shareId);

    if (error) throw error;

    console.log('✅ Compartilhamento removido!');
  } catch (error) {
    console.error('❌ Erro ao remover compartilhamento:', error);
    throw error;
  }
};

/**
 * Gera relatório de comparação entre versões
 */
export const generateVersionComparison = (
  current: StrategicMap,
  previous: StrategicMap
): string => {
  const changes: string[] = [];

  const currentObjCount = current.objectives?.length || 0;
  const previousObjCount = previous.objectives?.length || 0;
  const objDiff = currentObjCount - previousObjCount;

  if (objDiff !== 0) {
    changes.push(
      objDiff > 0
        ? `✅ Adicionados ${objDiff} novo(s) objetivo(s)`
        : `❌ Removidos ${Math.abs(objDiff)} objetivo(s)`
    );
  }

  const currentKpisCount = current.objectives?.reduce(
    (sum, obj) => sum + (obj.kpis?.length || 0),
    0
  ) || 0;
  const previousKpisCount = previous.objectives?.reduce(
    (sum, obj) => sum + (obj.kpis?.length || 0),
    0
  ) || 0;
  const kpisDiff = currentKpisCount - previousKpisCount;

  if (kpisDiff !== 0) {
    changes.push(
      kpisDiff > 0
        ? `✅ Adicionados ${kpisDiff} novo(s) KPI(s)`
        : `❌ Removidos ${Math.abs(kpisDiff)} KPI(s)`
    );
  }

  if (current.mission !== previous.mission) {
    changes.push('📝 Missão atualizada');
  }

  if (current.vision !== previous.vision) {
    changes.push('📝 Visão atualizada');
  }

  if (changes.length === 0) {
    return 'Nenhuma mudança estrutural detectada.';
  }

  return '**Mudanças detectadas:**\n\n' + changes.join('\n');
};

