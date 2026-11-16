import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/queries/finance', () => ({
  useCashBoxOptions: () => ({
    data: {
      data: [
        { cashBoxId: 'banco', name: 'Banco Nación', kind: 'bank', balance: 1500, requiresSession: false },
        {
          cashBoxId: 'efe',
          name: 'Caja central',
          kind: 'cash',
          balance: 200,
          requiresSession: true,
          openSessionId: null,
        },
        { cashBoxId: 'mp', name: 'Mercado Pago', kind: 'wallet', balance: 50, requiresSession: false },
      ],
    },
    isPending: false,
    isError: false,
  }),
}));

import { PayExpenseModal, type ExpensePaymentSubmit } from './PayExpenseModal';

afterEach(cleanup);

const draw = (props: Partial<Parameters<typeof PayExpenseModal>[0]> = {}) => {
  const onSubmit = vi.fn<[ExpensePaymentSubmit], void>();
  render(
    <PayExpenseModal open onClose={vi.fn()} title="Registrar pago" pending={false} onSubmit={onSubmit} {...props} />,
  );
  return onSubmit;
};

describe('PayExpenseModal', () => {
  it('ofrece cajas de efectivo, banco y billetera', () => {
    draw();
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options.join('|')).toMatch(/Banco Nación · Banco/);
    expect(options.join('|')).toMatch(/Caja central · Efectivo/);
    expect(options.join('|')).toMatch(/Mercado Pago · Billetera/);
  });

  it('sin caja no manda nada y lo dice', async () => {
    const onSubmit = draw();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Elegí la caja')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('con caja y fecha manda la caja y el instante ISO', async () => {
    const onSubmit = draw();
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'banco' } });
    fireEvent.change(screen.getByLabelText(/Fecha y hora del pago/), { target: { value: '2026-10-01T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = onSubmit.mock.calls[0][0];
    expect(sent.cashBoxId).toBe('banco');
    expect(new Date(sent.at).getTime()).toBe(new Date('2026-10-01T10:00').getTime());
    expect(sent.amount).toBeUndefined();
  });

  it('con importe lo precarga, valida el tope y lo manda como número', async () => {
    const onSubmit = draw({ amount: { initial: 800, max: 1000, label: 'Importe pagado' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'mp' } });
    expect(screen.getByLabelText(/Importe pagado/)).toHaveValue(800);
    fireEvent.change(screen.getByLabelText(/Importe pagado/), { target: { value: '1200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('No puede superar lo cargado al cerrar')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Importe pagado/), { target: { value: '950.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ cashBoxId: 'mp', amount: 950.5 });
  });

  it('una caja de efectivo sin sesión abierta avisa antes de guardar', () => {
    draw();
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'efe' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/no tiene la sesión abierta/);
  });

  it('el cobro (reintegro) habla de la caja en la que entra', () => {
    draw({ income: true });
    expect(screen.getByRole('combobox', { name: /Caja en la que entra/ })).toBeInTheDocument();
  });

  it('no deja fecha futura ni anterior al gasto', async () => {
    const onSubmit = draw({ notBefore: '2026-10-20T12:00:00.000Z', notBeforeMessage: 'Antes del siniestro' });
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'banco' } });
    fireEvent.change(screen.getByLabelText(/Fecha y hora del pago/), { target: { value: '2026-10-01T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Antes del siniestro')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Fecha y hora del pago/), { target: { value: '2999-01-01T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('La fecha no puede ser futura')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
