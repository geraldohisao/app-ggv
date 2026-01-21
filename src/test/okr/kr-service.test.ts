import { describe, it, expect, vi, beforeEach } from 'vitest';
import { suggestKeyResults } from '../../../components/okr/services/krAIService';
import { supabase } from '../../../services/supabaseClient';

// Mock supabase
vi.mock('../../../services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe('krAIService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should suggest KRs using OpenAI if key exists', async () => {
        // Mock App Settings for OpenAI Key
        const mockFrom = vi.mocked(supabase.from);
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { value: 'sk-openai-key' }, error: null })
                })
            })
        } as any);

        // Mock OpenAI Response
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            suggestions: [
                                { title: "KR 1", type: "numeric", target_value: 10 }
                            ]
                        })
                    }
                }]
            })
        });

        const result = await suggestKeyResults("Increase revenue");
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe("KR 1");
    });

    it('should fallback to Gemini if OpenAI fails', async () => {
        // Mock App Settings: OpenAI key exists, Gemini key exists
        const mockFrom = vi.mocked(supabase.from);
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn()
                        .mockResolvedValueOnce({ data: { value: 'sk-openai' }, error: null }) // OpenAI
                        .mockResolvedValueOnce({ data: { value: 'sk-gemini' }, error: null }) // Gemini
                })
            })
        } as any);

        // OpenAI Fails
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ error: "Server Error" })
        })
            // Gemini Succeeds
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    suggestions: [
                                        { title: "KR Gemini", type: "numeric", target_value: 10 }
                                    ]
                                })
                            }]
                        }
                    }]
                })
            });

        const result = await suggestKeyResults("Increase revenue");
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe("KR Gemini");
    });

    it('should throw error if no keys are found', async () => {
        // Mock No Keys
        const mockFrom = vi.mocked(supabase.from);
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                })
            })
        } as any);

        await expect(suggestKeyResults("Objective")).rejects.toThrow('Não foi possível gerar sugestões de KRs no momento.');
    });
});
