/**
 * Service para extração automática de valor e pessoa de documentos de OS
 */

export interface ExtractionResult {
    success: boolean;
    osId: string;
    extracted?: {
        valor: string | null;
        pessoa: string | null;
        confidence: number;
        status: 'PENDING' | 'SUCCESS' | 'REVIEW' | 'ERROR';
    };
    error?: string;
}

/**
 * Dispara extração automática de metadados de uma OS
 */
export async function extractOSMetadata(osId: string): Promise<ExtractionResult> {
    try {
        console.log('🔍 Iniciando extração automática para OS:', osId);

        const functionUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:8888/.netlify/functions/extract-os-metadata'
            : '/.netlify/functions/extract-os-metadata';

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ osId })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }

        console.log('✅ Extração concluída:', result);

        return result;
    } catch (error: any) {
        console.error('❌ Erro ao extrair metadados:', error);
        return {
            success: false,
            osId,
            error: error.message
        };
    }
}

/**
 * Verifica o status de extração de uma OS
 */
export async function getExtractionStatus(osId: string): Promise<{
    status: string;
    valor: string | null;
    pessoa: string | null;
    confidence: number;
    log: any;
} | null> {
    // Implementar busca do status no banco se necessário
    // Por enquanto, apenas um placeholder
    return null;
}

