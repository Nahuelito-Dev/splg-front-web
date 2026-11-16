import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok, renderPage } from '../../../../test/pageTest';

const cases = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/queries/recovery', () => ({
  useRecoveryCases: (...args: unknown[]) => cases(...args) as unknown,
}));

import { CustomerRecoveryCard } from './CustomerRecoveryCard';

const caso = (over: Record<string, unknown>) => ({
  caseId: 'c-1',
  status: 'open',
  step: 1,
  depositAmount: 26000,
  deliveredAt: '2026-08-19T19:12:04.000Z',
  stepDueAt: '2026-11-07T15:00:00.000Z',
  closedAt: null,
  pickup: null,
  cylinder: { serial: 'SPLG-00159' },
  ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const draw = () => renderPage(<CustomerRecoveryCard userId="u-1" />);

describe('CustomerRecoveryCard', () => {
  it('pide al back los casos en pie del cliente y los muestra', () => {
    cases.mockReturnValue(
      ok({
        data: [caso({})],
        total: 1,
        counts: {},
      }),
    );
    draw();
    expect(cases).toHaveBeenCalledWith({ page: 0, pageSize: 50 }, { customerId: 'u-1', live: true });
    expect(screen.getByText('SPLG-00159')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'SPLG-00159' })).toHaveAttribute(
      'href',
      '/physical-cylinders/recovery?case=c-1',
    );
  });

  it('sin casos abiertos lo dice', () => {
    cases.mockReturnValue(ok({ data: [], total: 0, counts: {} }));
    draw();
    expect(screen.getByText('Sin casos abiertos')).toBeInTheDocument();
  });

  it('muestra el error si falla', () => {
    cases.mockReturnValue(failed());
    draw();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar');
  });

  it('mientras carga no muestra el vacío', () => {
    cases.mockReturnValue(loading());
    draw();
    expect(screen.queryByText('Sin casos abiertos')).not.toBeInTheDocument();
  });
});
