import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

interface Pending {
  id: string;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

// Cada baja queda pendiente hasta que el test la resuelve, para tener dos en curso a la vez.
const { calls, hold } = vi.hoisted(() => {
  const calls = { pending: [] as Pending[] };
  const hold = (id: string) =>
    new Promise((resolve, reject) => {
      calls.pending.push({ id, resolve, reject });
    });
  return { calls, hold };
});
vi.mock('../api/assistant', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  deleteCompanyFaq: hold,
  deletePlatformFaq: hold,
  deletePlatformTemplate: hold,
}));

import { queryKeys } from './queryKeys';
import { useDeleteCompanyFaq, useDeletePlatformFaq, useDeletePlatformTemplate } from './assistant';

const HOOKS = [
  { name: 'useDeleteCompanyFaq', use: useDeleteCompanyFaq, key: queryKeys.assistantFaqs.all },
  { name: 'useDeletePlatformFaq', use: useDeletePlatformFaq, key: queryKeys.platformAssistantFaqs.all },
  { name: 'useDeletePlatformTemplate', use: useDeletePlatformTemplate, key: queryKeys.platformAssistantTemplates.all },
];

const setup = (use: (typeof HOOKS)[number]['use']) => {
  calls.pending = [];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const onSuccess = vi.fn();
  const onError = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => use({ onSuccess, onError }), { wrapper });
  return { hook, invalidate, onSuccess, onError };
};

describe.each(HOOKS)('$name', ({ use, key }) => {
  it('dos bajas seguidas: se avisan los dos resultados (no sólo el del último `mutate`)', async () => {
    const { hook, onSuccess, onError } = setup(use);
    act(() => hook.result.current.mutate('a'));
    act(() => hook.result.current.mutate('b'));
    await waitFor(() => expect(calls.pending.map((p) => p.id)).toEqual(['a', 'b']));

    const error = new Error('falló a');
    await act(async () => {
      calls.pending[0].reject(error);
      calls.pending[1].resolve(undefined);
      await Promise.resolve();
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('refresca la base también si la baja falla', async () => {
    const { hook, invalidate } = setup(use);
    act(() => hook.result.current.mutate('a'));
    await waitFor(() => expect(calls.pending).toHaveLength(1));
    await act(async () => {
      calls.pending[0].reject(new Error('falló'));
      await Promise.resolve();
    });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: key }));
  });
});
