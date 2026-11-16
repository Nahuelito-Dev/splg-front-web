import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getDelivery = vi.hoisted(() => vi.fn<[string], Promise<unknown>>());
const validateDelivery = vi.hoisted(() => vi.fn<[string], Promise<unknown>>());
const invalidateDelivery = vi.hoisted(() => vi.fn<[string], Promise<unknown>>());
const notifySuccess = vi.hoisted(() => vi.fn<[string], void>());
const notifyError = vi.hoisted(() => vi.fn<[Error], void>());

vi.mock('../api/deliveries', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getDelivery: (id: string) => getDelivery(id),
  validateDelivery: (id: string) => validateDelivery(id),
  invalidateDelivery: (id: string) => invalidateDelivery(id),
}));
vi.mock('../../utils/notifications', () => ({
  notify: { success: notifySuccess, error: notifyError, info: vi.fn() },
}));

import { useBulkValidateDeliveries } from './deliveries';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('validar choferes en lote', () => {
  it('antes de cada fila vuelve a pedir el chofer: los que ya están validados se omiten, no son fallas', async () => {
    const validated: Record<string, boolean> = { a: false, b: true, c: false };
    getDelivery.mockImplementation((id: string) => Promise.resolve({ delivery_id: id, validated: validated[id] }));
    validateDelivery.mockResolvedValue({});
    const { result } = renderHook(() => useBulkValidateDeliveries(), { wrapper });
    await act(() => result.current.mutateAsync({ ids: ['a', 'b', 'c'], validated: true }));

    expect(validateDelivery.mock.calls.map(([id]) => id)).toEqual(['a', 'c']);
    expect(invalidateDelivery).not.toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith('2 de 3 choferes actualizados. 1 omitido (ya no aplicaba).');
  });

  it('retirar la validación llama a invalidar y una falla se avisa con su motivo', async () => {
    getDelivery.mockResolvedValue({ validated: true });
    invalidateDelivery.mockImplementation((id: string) =>
      id === 'a' ? Promise.reject(new Error('Boom')) : Promise.resolve({}),
    );
    const { result } = renderHook(() => useBulkValidateDeliveries(), { wrapper });
    await act(() => result.current.mutateAsync({ ids: ['a', 'b'], validated: false }));

    expect(invalidateDelivery).toHaveBeenCalledTimes(2);
    expect(validateDelivery).not.toHaveBeenCalled();
    expect(notifyError.mock.calls[0][0].message).toContain('1 de 2 choferes actualizados. Fallaron 1.');
    expect(notifyError.mock.calls[0][0].message).toContain('Boom');
  });
});
