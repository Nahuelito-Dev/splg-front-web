import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loading, ok, pageOf } from '../../../test/pageTest';

const fines = vi.hoisted(() => ({ result: undefined as unknown }));
vi.mock('../../../services/queries/fleetExpense', () => ({ useTrafficFines: () => fines.result }));
vi.mock('./PayFineModal', () => ({
  PayFineModal: ({ fine }: { fine: { actNumber: string } | null }) =>
    fine ? <p>Modal de pago {fine.actNumber}</p> : null,
}));
vi.mock('./TrafficFineFormModal', () => ({ TrafficFineFormModal: () => null }));

import { CarFinesTab } from './CarFinesTab';

const fine = (over: Record<string, unknown>) => ({
  fineId: 'm',
  actNumber: 'A-1',
  jurisdiction: 'Posadas',
  amount: 85000,
  dueDate: '2026-11-15',
  status: 'pending',
  paymentUrl: 'https://pagos.posadas.test/m',
  ...over,
});

const renderTab = (canWrite = true) =>
  render(
    <MemoryRouter>
      <CarFinesTab carId="c-1" canWrite={canWrite} />
    </MemoryRouter>,
  );

beforeEach(() => {
  fines.result = ok(
    pageOf([
      fine({ fineId: 'm1', actNumber: 'A-1' }),
      fine({ fineId: 'm2', actNumber: 'A-2', status: 'appealed', paymentUrl: null }),
      fine({ fineId: 'm3', actNumber: 'A-3', status: 'paid' }),
      fine({ fineId: 'm4', actNumber: 'A-4', status: 'voided' }),
    ]),
  );
});
afterEach(cleanup);

describe('CarFinesTab', () => {
  it('muestra el estado de carga', () => {
    fines.result = loading();
    renderTab();
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
  });

  it('las multas pendientes y apeladas tienen Pagar y Registrar pago; las pagas y anuladas no', () => {
    renderTab();
    expect(screen.getAllByRole('button', { name: 'Registrar pago' })).toHaveLength(2);
    expect(screen.getAllByText('Pagar')).toHaveLength(2);
  });

  it('Pagar abre el enlace de pago en otra pestaña; sin enlace queda bloqueado', () => {
    renderTab();
    const link = screen.getByRole('link', { name: /Pagar/ });
    expect(link).toHaveAttribute('href', 'https://pagos.posadas.test/m');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('button', { name: 'Pagar' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('Registrar pago abre el formulario de pago de esa multa', () => {
    renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: 'Registrar pago' })[1]);
    expect(screen.getByText('Modal de pago A-2')).toBeInTheDocument();
  });

  it('sin permiso de escritura Registrar pago está deshabilitado', () => {
    renderTab(false);
    for (const button of screen.getAllByRole('button', { name: 'Registrar pago' })) expect(button).toBeDisabled();
  });
});
