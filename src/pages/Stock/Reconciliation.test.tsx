import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  query: vi.fn(),
  reapply: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
}));
vi.mock('../../services/queries/stock', () => ({
  useReconciliation: () => state.query() as unknown,
  useReapplyDeliveries: () => state.reapply() as unknown,
}));
vi.mock('../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: state.success, error: state.error },
}));
vi.mock('./components/ReconciliationAdjustModal', () => ({
  ReconciliationAdjustModal: ({ difference }: { difference: { gasCylinderType: string } | null }) =>
    difference ? <p>Ajustar {difference.gasCylinderType}</p> : null,
}));

import { Reconciliation } from './Reconciliation';

const REPORT = {
  checkedAt: '2026-10-12T03:00:00.000Z',
  consistent: false,
  cylinders: [
    {
      gasCylinderId: 'g-1',
      gasCylinderType: '10kg',
      sellable: 8,
      physicalFull: 10,
      reserved: 1,
      expected: 9,
      difference: -1,
    },
    {
      gasCylinderId: 'g-2',
      gasCylinderType: '15kg',
      sellable: 3,
      physicalFull: 3,
      reserved: 0,
      expected: 3,
      difference: 0,
    },
  ],
  deliveriesWithoutMovement: [
    {
      orderId: 'o-1234567890',
      deliveredAt: '2026-10-11T18:00:00.000Z',
      gasCylinderId: 'g-1',
      gasCylinderType: '10kg',
      quantity: 2,
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Reconciliation', () => {
  it('muestra las diferencias y las entregas sin movimiento', () => {
    state.query.mockReturnValue(ok(REPORT));
    state.reapply.mockReturnValue(mutation());
    renderPage(<Reconciliation />, { url: '/stock/reconciliation' });
    expect(screen.getByText('Con diferencias')).toBeInTheDocument();
    expect(screen.getAllByText('10kg').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Ajuste de conciliación' })).toHaveLength(1);
  });

  it('un error del back se dice y permite reintentar', () => {
    const refetch = vi.fn();
    state.query.mockReturnValue(failed(refetch));
    state.reapply.mockReturnValue(mutation());
    renderPage(<Reconciliation />, { url: '/stock/reconciliation' });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('mientras carga no muestra un informe', () => {
    state.query.mockReturnValue(loading());
    state.reapply.mockReturnValue(mutation());
    renderPage(<Reconciliation />, { url: '/stock/reconciliation' });
    expect(screen.queryByText('Con diferencias')).not.toBeInTheDocument();
  });

  it('sin entregas pendientes lo dice y no deja reaplicar', () => {
    state.query.mockReturnValue(ok({ ...REPORT, consistent: true, deliveriesWithoutMovement: [] }));
    state.reapply.mockReturnValue(mutation());
    renderPage(<Reconciliation />, { url: '/stock/reconciliation' });
    expect(screen.getByText('Todas las entregas descontaron stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reaplicar entregas' })).toBeDisabled();
  });

  it('«Ajuste de conciliación» abre el ajuste de esa garrafa', () => {
    state.query.mockReturnValue(ok(REPORT));
    state.reapply.mockReturnValue(mutation());
    renderPage(<Reconciliation />, { url: '/stock/reconciliation' });
    fireEvent.click(screen.getByRole('button', { name: 'Ajuste de conciliación' }));
    expect(screen.getByText('Ajustar 10kg')).toBeInTheDocument();
  });

  it('reaplicar confirma y avisa el resultado; cancelar no llama al back', async () => {
    const reapply = mutation();
    reapply.mutate.mockImplementation((_vars: unknown, options?: unknown) =>
      (options as { onSuccess: (r: unknown) => void }).onSuccess({ revisados: 5, reaplicados: 2, pendientes: 0 }),
    );
    state.query.mockReturnValue(ok(REPORT));
    state.reapply.mockReturnValue(reapply);
    state.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderPage(<Reconciliation />, { url: '/stock/reconciliation' });
    fireEvent.click(screen.getByRole('button', { name: 'Reaplicar entregas' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(reapply.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reaplicar entregas' }));
    await waitFor(() => expect(state.success).toHaveBeenCalledWith('Revisados 5, reaplicados 2, pendientes 0'));
  });

  it('reservas por encima del físico: lo explica en vez de decir «Con diferencias» con todo en 0', () => {
    state.query.mockReturnValue(
      ok({
        ...REPORT,
        consistent: false,
        deliveriesWithoutMovement: [],
        cylinders: [
          {
            gasCylinderId: 'g-1',
            gasCylinderType: '10kg',
            sellable: 0,
            physicalFull: 2,
            reserved: 5,
            expected: 0,
            difference: 0,
            overReserved: 3,
          },
        ],
      }),
    );
    state.reapply.mockReturnValue(mutation());
    renderPage(<Reconciliation />, { url: '/stock/reconciliation' });
    expect(screen.getByText('Reservas de más')).toBeInTheDocument();
    expect(screen.queryByText('Con diferencias')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Hay más reservas que garrafas físicas');
    expect(screen.getByRole('alert')).toHaveTextContent('5 reservadas y 2 llenas físicas (faltan 3)');
    expect(screen.queryByRole('button', { name: 'Ajuste de conciliación' })).not.toBeInTheDocument();
  });

  it('sin reservas de más no muestra ese aviso', () => {
    state.query.mockReturnValue(ok(REPORT));
    state.reapply.mockReturnValue(mutation());
    renderPage(<Reconciliation />, { url: '/stock/reconciliation' });
    expect(screen.queryByText('Hay más reservas que garrafas físicas')).not.toBeInTheDocument();
  });
});
