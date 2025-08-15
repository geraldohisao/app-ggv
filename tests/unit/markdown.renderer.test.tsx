import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MarkdownRenderer from '../../components/ui/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('normalizes Resumo executivo headings and breaks long words', () => {
    const text = '### Resumo executivo\nTexto com ************************************************ e uma_url_muito_muito_longa_sem_espacos_que_deveria_quebrar_para_nao_dar_overflow';
    const { container, getByText } = render(<MarkdownRenderer text={text} />);
    expect(getByText('Resumo executivo')).toBeTruthy();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('break-words');
  });
});


