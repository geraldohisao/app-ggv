import { describe, it, expect, vi } from 'vitest';
import { startStep, newRequestId } from '../../src/utils/logger';

describe('logger basic', () => {
  it('startStep/endStep mede ms > 0', async () => {
    (globalThis as any).__DEV__ = true;
    const rid = newRequestId();
    const end = startStep({ requestId: rid }, 'unit_test');
    await new Promise(r => setTimeout(r, 5));
    end();
    expect(rid).toBeTruthy();
  });
});


