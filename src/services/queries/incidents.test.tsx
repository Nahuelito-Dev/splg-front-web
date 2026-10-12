import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Función común (no `vi.fn`): el espía dejaría sin atender la promesa rechazada.
const answer = vi.hoisted(() => ({ run: (): Promise<unknown> => Promise.resolve([]) }));
vi.mock('../api/incidents', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listIncidents: () => answer.run(),
}));

import { useIncidents } from './incidents';

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useIncidents(), { wrapper });
};

beforeEach(() => {
  answer.run = () => Promise.resolve([]);
});

describe('useIncidents', () => {
  it('mientras carga no hay datos ni error', () => {
    let release: (value: unknown[]) => void = () => undefined;
    answer.run = () => new Promise((resolve) => (release = resolve as typeof release));
    const { result, unmount } = setup();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
    unmount();
    release([]);
  });

  it('si falla expone el error y no una lista vacía', async () => {
    answer.run = () => Promise.reject(new Error('boom'));
    const { result } = setup();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toBe('boom');
  });
});
