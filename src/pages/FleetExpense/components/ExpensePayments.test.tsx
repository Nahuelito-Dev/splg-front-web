import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ canWrite: true }));
const mutations = vi.hoisted(() => ({
  fuel: { mutate: vi.fn<[unknown], void>(), isPending: false },
  accident: { mutate: vi.fn<[unknown], void>(), isPending: false },
  reimbursement: { mutate: vi.fn<[unknown], void>(), isPending: false },
  tire: { mutate: vi.fn<[unknown], void>(), isPending: false },
}));

vi.mock('../../../hooks', () => ({
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: 'Elegí una distribuidora' }),
}));
vi.mock('../../../services/queries/fleetExpense', () => ({
  usePayFuelLoad: () => mutations.fuel,
  usePayVehicleAccident: () => mutations.accident,
  useReceiveAccidentReimbursement: () => mutations.reimbursement,
  usePayTire: () => mutations.tire,
}));
vi.mock('../../../services/queries/finance', () => ({
  useCashBoxOptions: () => ({
    data: { data: [{ cashBoxId: 'banco', name: 'Banco', kind: 'bank', balance: 10, requiresSession: false }] },
    isPending: false,
    isError: false,
  }),
}));

import { AccidentPayment } from './AccidentPayment';
import { FuelLoadPayment } from './FuelLoadPayment';
import { TirePayment } from './TirePayment';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.canWrite = true;
});

const load = (over: object = {}) =>
  ({
    fuelLoadId: 'f-1',
    carPatent: 'AB123CD',
    totalAmount: 40000,
    loadedAt: '2026-10-01T12:00:00.000Z',
    paymentMethod: 'card',
    isPaid: false,
    isPayable: true,
    paidAt: null,
    voidedAt: null,
    ...over,
  }) as never;

const accident = (over: object = {}) =>
  ({
    accidentId: 's-1',
    carPatent: 'AB123CD',
    status: 'closed',
    occurredAt: '2026-10-01T12:00:00.000Z',
    repairCost: 80000,
    deductibleAmount: 10000,
    insurerReimbursement: 50000,
    isPaid: false,
    isReimbursed: false,
    paymentPaidAt: null,
    paymentAmount: null,
    reimbursementReceivedAt: null,
    reimbursementAmount: null,
    ...over,
  }) as never;

describe('Pago de los gastos de la flota', () => {
  it('carga con tarjeta sin pagar: «Sin pagar» y botón «Registrar pago» que manda la caja y la fecha', async () => {
    render(<FuelLoadPayment load={load()} />);
    expect(screen.getByText('Sin pagar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));
    fireEvent.change(screen.getByRole('combobox', { name: /Caja de la que sale/ }), { target: { value: 'banco' } });
    fireEvent.change(screen.getByLabelText(/Fecha y hora del pago/), { target: { value: '2026-10-05T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(mutations.fuel.mutate).toHaveBeenCalled());
    expect(mutations.fuel.mutate.mock.calls[0][0]).toMatchObject({ id: 'f-1', body: { cashBoxId: 'banco' } });
  });

  it('la carga que pagó el chofer con su efectivo no se paga desde una caja y dice por qué', () => {
    render(<FuelLoadPayment load={load({ paymentMethod: 'driver_cash', isPayable: false })} />);
    expect(screen.getByText(/se salda en su rendición/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
  });

  it('una carga paga muestra «Pago» con su fecha y sin botón', () => {
    render(<FuelLoadPayment load={load({ isPaid: true, isPayable: false, paidAt: '2026-10-05T13:00:00.000Z' })} />);
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
  });

  it('una carga anulada no muestra el pago', () => {
    const { container } = render(<FuelLoadPayment load={load({ voidedAt: '2026-10-02T00:00:00.000Z' })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sin permiso de escritura el botón queda bloqueado con el motivo', () => {
    state.canWrite = false;
    render(<TirePayment tire={{ tireId: 't-1', brand: 'Pirelli', size: '205', cost: 1000, isPaid: false } as never} />);
    expect(screen.getByRole('button', { name: 'Registrar pago' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('siniestro cerrado: el pago de la empresa no puede superar lo cargado al cerrar', async () => {
    render(<AccidentPayment accident={accident()} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Registrar pago' })[0]);
    fireEvent.change(screen.getByRole('combobox', { name: /Caja de la que sale/ }), { target: { value: 'banco' } });
    fireEvent.change(screen.getByLabelText(/Importe pagado/), { target: { value: '80000.01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('No puede superar lo cargado al cerrar')).toBeInTheDocument();
    expect(mutations.accident.mutate).not.toHaveBeenCalled();
  });

  it('«Registrar reintegro del seguro» manda un ingreso con el importe y la caja', async () => {
    render(<AccidentPayment accident={accident()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar reintegro del seguro' }));
    expect(screen.getByRole('combobox', { name: /Caja en la que entra/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Importe recibido/)).toHaveValue(50000);
    fireEvent.change(screen.getByRole('combobox', { name: /Caja en la que entra/ }), { target: { value: 'banco' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar reintegro' }));
    await vi.waitFor(() => expect(mutations.reimbursement.mutate).toHaveBeenCalled());
    expect(mutations.reimbursement.mutate.mock.calls[0][0]).toMatchObject({
      id: 's-1',
      body: { cashBoxId: 'banco', amount: 50000 },
    });
  });

  it('siniestro con pago y reintegro registrados muestra «Pago» y «Recibido» sin botones', () => {
    render(
      <AccidentPayment
        accident={accident({
          isPaid: true,
          paymentAmount: 80000,
          paymentPaidAt: '2026-10-05T13:00:00.000Z',
          isReimbursed: true,
          reimbursementAmount: 50000,
          reimbursementReceivedAt: '2026-10-06T13:00:00.000Z',
        })}
      />,
    );
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('Recibido')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
