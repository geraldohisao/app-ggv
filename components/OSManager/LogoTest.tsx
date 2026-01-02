import React, { useEffect, useState } from 'react';
import { getGGVLogoHTML } from '../../utils/brandLogoHelper';

/**
 * Componente de teste para verificar se o logo está sendo buscado corretamente
 * Acesse em: /logo-test (adicionar rota temporária)
 */
export const LogoTest: React.FC = () => {
    const [logoHTML, setLogoHTML] = useState<string>('Carregando...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogo = async () => {
            try {
                console.log('🧪 TESTE: Buscando logo...');
                const html = await getGGVLogoHTML();
                console.log('🧪 TESTE: Logo HTML recebido:', html);
                setLogoHTML(html);
            } catch (err: any) {
                console.error('🧪 TESTE: Erro ao buscar logo:', err);
                setError(err.message);
            }
        };

        fetchLogo();
    }, []);

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>🧪 Teste de Logo - Brand Logos</h1>
            
            <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
                <h2>Logo HTML Renderizado:</h2>
                <div 
                    style={{ 
                        padding: '20px', 
                        background: 'white', 
                        textAlign: 'center',
                        border: '2px solid #ddd',
                        borderRadius: '4px'
                    }}
                    dangerouslySetInnerHTML={{ __html: logoHTML }}
                />
            </div>

            <div style={{ marginTop: '20px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
                <h2>HTML Source:</h2>
                <pre style={{ 
                    background: '#1e1e1e', 
                    color: '#d4d4d4', 
                    padding: '15px', 
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
                    {logoHTML}
                </pre>
            </div>

            {error && (
                <div style={{ 
                    marginTop: '20px', 
                    padding: '20px', 
                    background: '#fee', 
                    borderRadius: '8px',
                    color: '#c00'
                }}>
                    <h2>❌ Erro:</h2>
                    <p>{error}</p>
                </div>
            )}

            <div style={{ marginTop: '20px', padding: '20px', background: '#e7f3ff', borderRadius: '8px' }}>
                <h2>📋 Checklist:</h2>
                <ul>
                    <li>✅ Verifique no console os logs (F12 → Console)</li>
                    <li>✅ Confirme que a URL da imagem está correta</li>
                    <li>✅ Teste abrir a URL da imagem em uma nova aba</li>
                    <li>✅ Verifique se não há erro de CORS no console</li>
                </ul>
            </div>
        </div>
    );
};

