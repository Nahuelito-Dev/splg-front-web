import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { previewCloseCashSession } from '../api/finance';
import { useCloseCashSessionPreview } from './finance';

vi.mock('../api/finance', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  previewCloseCashSession: vi.fn(),
}));

describe('useCloseCashSessionPreview', () => {
  it('no queda "fresca": volver a pedir el mismo importe vuelve a consultar al back', async () => {
    vi.mocked(previewCloseCashSession).mockResolvedValue({ difference: 1 } as never);
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const body = { countedAmount: 10 };
    const first = renderHook(() => useCloseCashSessionPreview('s1', body), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    renderHook(() => useCloseCashSessionPreview('s1', body), { wrapper });
    await waitFor(() => expect(previewCloseCashSession).toHaveBeenCalledTimes(2));
  });
});
