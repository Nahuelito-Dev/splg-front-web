import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const perms = vi.hoisted(() => ({ needsDistributor: false }));
const listRefunds = vi.hoisted(() => vi.fn(() => Promise.resolve({ items: [], total: 0, limit: 10, offset: 0 })));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: perms.needsDistributor, canOperate: !perms.needsDistributor }),
}));
vi.mock('../../services/api/refunds', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listRefunds,
}));

import { Refunds } from './Refunds';

afterEach(() => {
  cleanup();
  listRefunds.mockClear();
  perms.needsDistributor = false;
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Refunds />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('Refunds: administrador general sin distribuidora', () => {
  it('sin «Ver como» no pide los reintegros (la API exige X-Distributor) y pide elegir una', async () => {
    perms.needsDistributor = true;
    renderPage();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(listRefunds).not.toHaveBeenCalled();
  });

  it('con distribuidora elegida los pide', async () => {
    renderPage();
    await waitFor(() => expect(listRefunds).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Elegí una distribuidora')).not.toBeInTheDocument();
  });
});
