import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { companyItem } from '../../../test/platformFixtures';

const list = vi.hoisted(() => vi.fn());
vi.mock('../../../services/api/platformConsole', () => ({ listPlatformCompanies: list }));

import { CompanySelect } from './CompanySelect';

const draw = (value = '') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CompanySelect value={value} onChange={vi.fn()} emptyLabel="Todas" />
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  list.mockReset();
});

describe('CompanySelect', () => {
  it('trae todas las empresas de a páginas hasta el total de la API (sin tope de 100)', async () => {
    const all = Array.from({ length: 230 }, (_, i) => companyItem({ id: `c${i}`, name: `Empresa ${i}` }));
    list.mockImplementation(({ limit, offset }: { limit: number; offset: number }) =>
      Promise.resolve({ range: {}, items: all.slice(offset, offset + limit), total: all.length }),
    );
    draw();
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(231), { timeout: 4000 });
    expect(list.mock.calls.map(([params]) => (params as { offset: number }).offset)).toEqual([0, 100, 200]);
    expect(screen.getByRole('option', { name: 'Empresa 229' })).toBeInTheDocument();
  });

  it('la propia se marca y una elegida que no está vigente no se pierde', async () => {
    list.mockResolvedValue({
      range: {},
      items: [companyItem({ id: 'c-own', name: 'Prueba', ownedByPlatform: true })],
      total: 1,
    });
    draw('c-baja');
    expect(await screen.findByRole('option', { name: 'Prueba (propia)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Empresa no vigente' })).toBeInTheDocument();
  });
});
