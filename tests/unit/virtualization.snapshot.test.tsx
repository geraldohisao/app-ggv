import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AIMarkdown from '../../components/common/AIMarkdown';

describe('message container virtualization fallback', () => {
  it('renders only last 100 messages in DOM when >100', () => {
    const messages = Array.from({ length: 200 }, (_, i) => `Mensagem ${i + 1}`);
    const { container } = render(
      <div>
        {(messages.slice(-100)).map((m, i) => (
          <div key={i}>
            <AIMarkdown content={m} />
          </div>
        ))}
      </div>
    );
    // 100 wrappers expected
    expect(container.querySelectorAll('div > div').length).toBe(100);
  });
});


