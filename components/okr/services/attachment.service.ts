import { supabase } from '../../../services/supabaseClient';
import { SprintAttachment, AttachmentType, LinkType } from '../types/sprint.types';

const BUCKET_NAME = 'sprint-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================
// TIPOS AUXILIARES
// ============================================

export interface AddLinkData {
  sprint_id: string;
  url: string;
  link_type: typeof LinkType[keyof typeof LinkType];
  title: string;
  description?: string;
  created_by?: string;
}

export interface UploadFileData {
  sprint_id: string;
  file: File;
  title: string;
  description?: string;
  created_by?: string;
}

// ============================================
// FUNÇÕES DE SERVIÇO
// ============================================

/**
 * Lista todos os anexos de uma sprint
 */
export async function listAttachments(sprintId: string): Promise<SprintAttachment[]> {
  try {
    const { data, error } = await supabase
      .from('sprint_attachments')
      .select('*')
      .eq('sprint_id', sprintId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar anexos:', error);
    return [];
  }
}

/**
 * Adiciona um link externo à sprint
 */
export async function addLink(data: AddLinkData): Promise<SprintAttachment | null> {
  try {
    const attachment = {
      sprint_id: data.sprint_id,
      type: AttachmentType.LINK,
      url: data.url,
      link_type: data.link_type,
      title: data.title,
      description: data.description || null,
      created_by: data.created_by || null,
    };

    const { data: result, error } = await supabase
      .from('sprint_attachments')
      .insert(attachment)
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Erro ao adicionar link:', error);
    throw error;
  }
}

/**
 * Faz upload de um arquivo e registra na sprint
 */
export async function uploadFile(data: UploadFileData): Promise<SprintAttachment | null> {
  try {
    const { file, sprint_id, title, description, created_by } = data;

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Gerar nome único para o arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${sprint_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload para o Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    // Registrar na tabela
    const attachment = {
      sprint_id,
      type: AttachmentType.FILE,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      file_type: file.type,
      title,
      description: description || null,
      created_by: created_by || null,
    };

    const { data: result, error: insertError } = await supabase
      .from('sprint_attachments')
      .insert(attachment)
      .select()
      .single();

    if (insertError) {
      // Se falhar ao inserir, tentar remover o arquivo uploadado
      await supabase.storage.from(BUCKET_NAME).remove([fileName]);
      throw insertError;
    }

    return result;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    throw error;
  }
}

/**
 * Remove um anexo (e o arquivo do Storage se for file)
 */
export async function deleteAttachment(attachment: SprintAttachment): Promise<boolean> {
  try {
    // Se for arquivo, remover do Storage primeiro
    if (attachment.type === AttachmentType.FILE && attachment.file_path) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([attachment.file_path]);

      if (storageError) {
        console.warn('Aviso: Erro ao remover arquivo do storage:', storageError);
        // Continuar mesmo com erro no storage
      }
    }

    // Remover da tabela
    const { error } = await supabase
      .from('sprint_attachments')
      .delete()
      .eq('id', attachment.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao remover anexo:', error);
    throw error;
  }
}

/**
 * Gera URL pública ou assinada para download do arquivo
 */
export async function getFileUrl(filePath: string): Promise<string | null> {
  try {
    // Tentar obter URL pública primeiro
    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (publicData?.publicUrl) {
      return publicData.publicUrl;
    }

    // Se não for público, gerar URL assinada (válida por 1 hora)
    const { data: signedData, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600);

    if (error) throw error;
    return signedData?.signedUrl || null;
  } catch (error) {
    console.error('Erro ao gerar URL do arquivo:', error);
    return null;
  }
}

/**
 * Extrai um nome sugerido da URL
 */
export function extractNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Google Docs/Sheets/Slides - pegar nome do path
    if (url.includes('docs.google.com')) {
      // URLs como: /document/d/ID/edit ou /spreadsheets/d/ID/edit
      const match = pathname.match(/\/d\/([^/]+)/);
      if (match) {
        // Tentar decodificar nome se estiver na URL
        const parts = pathname.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart !== 'edit' && lastPart !== 'view') {
          return decodeURIComponent(lastPart).replace(/[-_]/g, ' ');
        }
      }
    }
    
    // Google Drive
    if (url.includes('drive.google.com')) {
      const nameMatch = url.match(/[?&]name=([^&]+)/);
      if (nameMatch) {
        return decodeURIComponent(nameMatch[1]);
      }
    }
    
    // YouTube - tentar pegar título do vídeo (simplificado)
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:v=|youtu\.be\/)([^&?]+)/);
      if (videoId) {
        return `Vídeo ${videoId[1].substring(0, 8)}`;
      }
    }
    
    // Notion - pegar última parte do path
    if (url.includes('notion.so') || url.includes('notion.site')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        // Notion URLs têm formato: Nome-do-Doc-ID
        const cleanName = lastPart.replace(/-[a-f0-9]{32}$/i, '').replace(/-/g, ' ');
        if (cleanName.length > 2) {
          return cleanName;
        }
      }
    }
    
    // Figma - pegar nome do arquivo
    if (url.includes('figma.com')) {
      const parts = pathname.split('/').filter(Boolean);
      // URLs como: /file/ID/Nome-do-Arquivo ou /design/ID/Nome
      if (parts.length >= 3) {
        const name = parts[2];
        return decodeURIComponent(name).replace(/[-_]/g, ' ');
      }
    }
    
    // Loom - pegar nome do vídeo
    if (url.includes('loom.com')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const name = parts[parts.length - 1];
        return decodeURIComponent(name).replace(/[-_]/g, ' ').substring(0, 50);
      }
    }
    
    // Miro - pegar nome do board
    if (url.includes('miro.com')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const name = parts[parts.length - 1];
        const cleanName = name.replace(/[-_]/g, ' ');
        if (cleanName.length > 2 && !/^[a-z0-9]+$/i.test(cleanName)) {
          return cleanName;
        }
      }
    }
    
    // Fallback: última parte do path limpa
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      const decoded = decodeURIComponent(lastPart)
        .replace(/[-_]/g, ' ')
        .replace(/\.[^.]+$/, ''); // Remove extensão
      if (decoded.length > 2 && decoded.length < 100) {
        return decoded;
      }
    }
    
    // Se nada funcionar, retorna vazio
    return '';
  } catch {
    return '';
  }
}

/**
 * Detecta o tipo de link baseado na URL
 */
export function detectLinkType(url: string): typeof LinkType[keyof typeof LinkType] {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('drive.google.com') || lowerUrl.includes('docs.google.com/drive')) {
    return LinkType.DRIVE;
  }
  if (lowerUrl.includes('notion.so') || lowerUrl.includes('notion.site')) {
    return LinkType.NOTION;
  }
  if (lowerUrl.includes('figma.com')) {
    return LinkType.FIGMA;
  }
  if (lowerUrl.includes('miro.com')) {
    return LinkType.MIRO;
  }
  if (lowerUrl.includes('docs.google.com/spreadsheets') || lowerUrl.includes('sheets.google.com')) {
    return LinkType.SHEETS;
  }
  if (lowerUrl.includes('docs.google.com/document')) {
    return LinkType.DOCS;
  }
  if (lowerUrl.includes('docs.google.com/presentation') || lowerUrl.includes('slides.google.com')) {
    return LinkType.SLIDES;
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return LinkType.YOUTUBE;
  }
  if (lowerUrl.includes('loom.com')) {
    return LinkType.LOOM;
  }

  return LinkType.OTHER;
}

/**
 * Retorna ícone e cor baseado no tipo de link
 */
export function getLinkTypeInfo(linkType: typeof LinkType[keyof typeof LinkType]): { icon: string; label: string; color: string } {
  const types: Record<string, { icon: string; label: string; color: string }> = {
    [LinkType.DRIVE]: { icon: '📁', label: 'Google Drive', color: 'text-yellow-600 bg-yellow-50' },
    [LinkType.NOTION]: { icon: '📝', label: 'Notion', color: 'text-slate-800 bg-slate-100' },
    [LinkType.FIGMA]: { icon: '🎨', label: 'Figma', color: 'text-purple-600 bg-purple-50' },
    [LinkType.MIRO]: { icon: '🗂️', label: 'Miro', color: 'text-yellow-500 bg-yellow-50' },
    [LinkType.SHEETS]: { icon: '📊', label: 'Google Sheets', color: 'text-green-600 bg-green-50' },
    [LinkType.DOCS]: { icon: '📄', label: 'Google Docs', color: 'text-blue-600 bg-blue-50' },
    [LinkType.SLIDES]: { icon: '📽️', label: 'Google Slides', color: 'text-orange-600 bg-orange-50' },
    [LinkType.YOUTUBE]: { icon: '▶️', label: 'YouTube', color: 'text-red-600 bg-red-50' },
    [LinkType.LOOM]: { icon: '🎥', label: 'Loom', color: 'text-indigo-600 bg-indigo-50' },
    [LinkType.OTHER]: { icon: '🔗', label: 'Link', color: 'text-slate-600 bg-slate-50' },
  };

  return types[linkType] || types[LinkType.OTHER];
}

/**
 * Retorna ícone baseado no tipo de arquivo
 */
export function getFileTypeInfo(mimeType: string): { icon: string; label: string; color: string } {
  if (mimeType.startsWith('image/')) {
    return { icon: '🖼️', label: 'Imagem', color: 'text-pink-600 bg-pink-50' };
  }
  if (mimeType === 'application/pdf') {
    return { icon: '📄', label: 'PDF', color: 'text-red-600 bg-red-50' };
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return { icon: '📊', label: 'Planilha', color: 'text-green-600 bg-green-50' };
  }
  if (mimeType.includes('document') || mimeType.includes('word')) {
    return { icon: '📝', label: 'Documento', color: 'text-blue-600 bg-blue-50' };
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return { icon: '📽️', label: 'Apresentação', color: 'text-orange-600 bg-orange-50' };
  }
  if (mimeType.startsWith('video/')) {
    return { icon: '🎬', label: 'Vídeo', color: 'text-purple-600 bg-purple-50' };
  }
  if (mimeType.startsWith('audio/')) {
    return { icon: '🎵', label: 'Áudio', color: 'text-indigo-600 bg-indigo-50' };
  }
  if (mimeType === 'text/plain') {
    return { icon: '📃', label: 'Texto', color: 'text-slate-600 bg-slate-50' };
  }

  return { icon: '📎', label: 'Arquivo', color: 'text-slate-600 bg-slate-50' };
}

/**
 * Formata tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
