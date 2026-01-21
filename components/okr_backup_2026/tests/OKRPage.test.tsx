/**
 * Testes para OKRPage
 * Execute: npm test OKRPage.test.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OKRPage from '../OKRPage';

// Mock dos contextos
vi.mock('../../../contexts/DirectUserContext', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN'
    }
  })
}));

describe('OKRPage', () => {
  it('deve renderizar dashboard por padrão', () => {
    render(<OKRPage />);
    expect(screen.getByText('Gestão de OKR')).toBeInTheDocument();
  });

  it('deve mostrar tela inicial ao criar novo OKR', async () => {
    render(<OKRPage />);
    
    const createButton = screen.getByText('Criar Novo OKR');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Construção Estratégica')).toBeInTheDocument();
    });
  });

  it('deve ter botões de criar com IA e do zero', async () => {
    render(<OKRPage />);
    
    const createButton = screen.getByText('Criar Novo OKR');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Gerar Plano com IA')).toBeInTheDocument();
      expect(screen.getByText('Construir do Zero')).toBeInTheDocument();
    });
  });
});

/**
 * INSTRUÇÕES PARA RODAR TESTES:
 * 
 * 1. Instalar dependências:
 *    npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
 * 
 * 2. Adicionar ao package.json:
 *    "scripts": {
 *      "test": "vitest"
 *    }
 * 
 * 3. Criar vitest.config.ts na raiz do projeto
 * 
 * 4. Rodar testes:
 *    npm test
 */

