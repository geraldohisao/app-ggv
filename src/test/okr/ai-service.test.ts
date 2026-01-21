import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateStrategicMapWithAI } from '../../../services/okrAIService';
import { supabase } from '../../../services/supabaseClient';

// Mock supabase
vi.mock('../../../services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe('okrAIService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should use OpenAI key if available and succeed', async () => {
        // Mock App Settings for OpenAI Key
        const mockFrom = vi.mocked(supabase.from);
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { value: 'sk-openai-key' }, error: null })
                })
            })
        } as any);

        // Mock OpenAI Fetch Response
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            company_name: "Test Corp",
                            date: "2024-01-01",
                            mission: "To test",
                            objectives: []
                        })
                    }
                }]
            })
        });

        const result = await generateStrategicMapWithAI("Contexto de teste com mais de 50 caracteres para garantir que passe na validação.");

        expect(result.company_name).toBe("Test Corp");
        // Verify OpenAI endpoint was called
        expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.anything());
    });


    it('should fallback to Gemini if OpenAI fails', async () => {
        // Mock App Settings: OpenAI key fails or fetch fails
        const mockFrom = vi.mocked(supabase.from);
        // First call for OpenAI key (success), second for Gemini key (success)
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn()
                        .mockResolvedValueOnce({ data: { value: 'sk-openai-key' }, error: null }) // OpenAI
                        .mockResolvedValueOnce({ data: { value: 'sk-gemini-key' }, error: null }) // Gemini
                })
            })
        } as any);

        // OpenAI Fetch Fails
        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: "Server Error" })
            })
            // Gemini Fetch Succeeds
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    company_name: "Gemini Corp",
                                    date: "2024-01-01",
                                    mission: "To fallback",
                                    objectives: []
                                })
                            }]
                        }
                    }]
                })
            });

        const result = await generateStrategicMapWithAI("Contexto de teste com mais de 50 caracteres para garantir que passe na validação.");

        expect(result.company_name).toBe("Gemini Corp");
        // Verify both endpoints called
        expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://api.openai.com/v1/chat/completions', expect.anything());
        expect(global.fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('generativelanguage.googleapis.com'), expect.anything());
    });
});
