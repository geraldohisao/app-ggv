import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AppErrorBoundary from '../../components/common/AppErrorBoundary';

const Boom: React.FC = () => {
  throw new Error('boom');
};

describe('AppErrorBoundary', () => {
  it('renders fallback message on error', () => {
    const { getByText } = render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>
    );
    expect(getByText('Ocorreu um erro. Tente novamente.')).toBeTruthy();
  });
});


