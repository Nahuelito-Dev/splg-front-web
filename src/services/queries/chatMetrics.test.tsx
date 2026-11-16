import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { chatMetrics, platformChatMetrics } from '../../test/chatMetricsFixtures';

const api = vi.hoisted(() => ({ getChatMetrics: vi.fn(), getPlatformChatMetrics: vi.fn() }));
vi.mock('../api/chatMetrics', () => api);

import type { ChatMetricsParams, PlatformChatMetricsParams } from '../api/chatMetrics';
import { useChatMetrics, usePlatformChatMetrics } from './chatMetrics';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);
/** Una respuesta que no llega nunca: deja la consulta nueva pendiente. */
const never = () => new Promise<never>(() => undefined);

describe('métricas: qué se muestra mientras llega otra selección', () => {
  it('empresa: otro período del mismo canal deja el anterior (marcado); otro canal, no', async () => {
    const first = chatMetrics();
    api.getChatMetrics.mockResolvedValueOnce(first).mockImplementation(never);
    const { result, rerender } = renderHook((params: ChatMetricsParams) => useChatMetrics(params), {
      wrapper,
      initialProps: { channel: 'staff_customer' },
    });
    await waitFor(() => expect(result.current.data).toBe(first));

    rerender({ channel: 'staff_customer', from: '2026-11-10', to: '2026-11-16' });
    expect(result.current.data).toBe(first);
    expect(result.current.isPlaceholderData).toBe(true);

    rerender({ channel: 'staff_driver', from: '2026-11-10', to: '2026-11-16' });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);
  });

  it('plataforma: otra empresa no conserva los números de la anterior', async () => {
    const first = platformChatMetrics();
    api.getPlatformChatMetrics.mockResolvedValueOnce(first).mockImplementation(never);
    const { result, rerender } = renderHook((params: PlatformChatMetricsParams) => usePlatformChatMetrics(params), {
      wrapper,
      initialProps: {},
    });
    await waitFor(() => expect(result.current.data).toBe(first));

    rerender({ from: '2026-11-10', to: '2026-11-16' });
    expect(result.current.isPlaceholderData).toBe(true);

    rerender({ from: '2026-11-10', to: '2026-11-16', distributorId: 'd-1' });
    expect(result.current.data).toBeUndefined();
    expect(api.getPlatformChatMetrics).toHaveBeenLastCalledWith({
      from: '2026-11-10',
      to: '2026-11-16',
      distributorId: 'd-1',
    });
  });
});
