import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ task: {} as Record<string, unknown> }));
const close = vi.hoisted(() => ({ mutate: vi.fn<[unknown], void>(), isPending: false }));
const closeAndPay = vi.hoisted(() => ({ mutate: vi.fn<[unknown], void>(), isPending: false }));
const pay = vi.hoisted(() => ({ mutate: vi.fn<[unknown], void>(), isPending: false }));

vi.mock('../../../hooks', () => ({ usePermissions: () => ({ canWrite: true, writeHint: undefined }) }));
vi.mock('../../../services/queries/fleet', () => ({
  useCloseFleetTask: () => close,
  useCloseFleetTaskAndPay: () => closeAndPay,
  usePayFleetTask: () => pay,
  useFleetTask: () => ({ data: state.task, isPending: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../../services/queries/finance', () => ({
  useCashBoxOptions: () => ({
    data: { data: [{ cashBoxId: 'banco', name: 'Banco', kind: 'bank', balance: 10, requiresSession: false }] },
    isPending: false,
    isError: false,
  }),
}));

import { FleetTaskCloseModal } from './FleetTaskCloseModal';
import { FleetTaskPayment } from './FleetTaskPayment';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const doneTask = (over: Record<string, unknown> = {}) => ({
  taskId: 't-1',
  status: 'done',
  cost: 45000,
  performedAt: '2026-10-20T12:00:00.000Z',
  plan: { name: 'VTV' },
  isPaid: false,
  payable: true,
  notPayableReason: null,
  paidAt: null,
  paidAmount: null,
  ...over,
});

describe('FleetTaskPayment', () => {
  it('una tarea hecha con costo ofrece «Registrar pago»', () => {
    state.task = doneTask();
    render(<FleetTaskPayment taskId="t-1" />);
    expect(screen.getByText('Sin pagar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar pago' })).toBeInTheDocument();
  });

  it('una tarea de seguro no ofrece pagar y dice que se paga por sus cuotas', () => {
    state.task = doneTask({ payable: false, notPayableReason: 'El seguro se paga por sus cuotas' });
    render(<FleetTaskPayment taskId="t-1" />);
    expect(screen.getByText('El seguro se paga por sus cuotas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
  });

  it('el pago no puede ser anterior a cuando se hizo la tarea', async () => {
    state.task = doneTask();
    render(<FleetTaskPayment taskId="t-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));
    fireEvent.change(screen.getByRole('combobox', { name: /Caja de la que sale/ }), { target: { value: 'banco' } });
    fireEvent.change(screen.getByLabelText(/Fecha y hora del pago/), { target: { value: '2026-10-10T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText(/anterior a la fecha en que se hizo/)).toBeInTheDocument();
    expect(pay.mutate).not.toHaveBeenCalled();
  });
});

describe('FleetTaskCloseModal: «Lo pagué ahora»', () => {
  const draw = (task: Record<string, unknown>) =>
    render(<FleetTaskCloseModal open onClose={vi.fn()} task={task as never} />);

  it('usa el costo que la tarea ya tiene si no se tipea otro', async () => {
    draw({ taskId: 't-2', cost: 5000, provider: null, plan: { name: 'Service' } });
    fireEvent.click(screen.getByLabelText(/Lo pagué ahora/));
    fireEvent.change(screen.getByRole('combobox', { name: /Caja de la que sale/ }), { target: { value: 'banco' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar tarea' }));
    await waitFor(() => expect(closeAndPay.mutate).toHaveBeenCalled());
    const sent = closeAndPay.mutate.mock.calls[0][0] as { body: { cost?: number; payment: { cashBoxId: string } } };
    expect(sent.body.cost).toBeUndefined();
    expect(sent.body.payment).toEqual({ cashBoxId: 'banco' });
  });

  it('sin costo en la tarea ni en el formulario pide ingresarlo', async () => {
    draw({ taskId: 't-3', cost: null, provider: null, plan: { name: 'Service' } });
    fireEvent.click(screen.getByLabelText(/Lo pagué ahora/));
    fireEvent.change(screen.getByRole('combobox', { name: /Caja de la que sale/ }), { target: { value: 'banco' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar tarea' }));
    expect(await screen.findByText('Para pagarla ahora ingresá el costo')).toBeInTheDocument();
    expect(closeAndPay.mutate).not.toHaveBeenCalled();
  });

  it('una tarea de seguro no ofrece «Lo pagué ahora»', () => {
    draw({ taskId: 't-4', cost: 5000, provider: null, plan: { name: 'Seguro', documentKind: 'insurance' } });
    expect(screen.queryByLabelText(/Lo pagué ahora/)).not.toBeInTheDocument();
    expect(screen.getByText('El seguro se paga por sus cuotas.')).toBeInTheDocument();
  });
});
