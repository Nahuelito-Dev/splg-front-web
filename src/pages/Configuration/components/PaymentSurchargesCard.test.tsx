import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import { failed, mutation, ok } from '../../../test/pageTest';
import { PaymentSurchargesCard } from './PaymentSurchargesCard';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  query: undefined as unknown,
  update: undefined as unknown,
}));
const queryOptions = vi.hoisted(() => vi.fn());
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const confirm = vi.hoisted(() => vi.fn());
vi.mock('../../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../../services/queries/paymentSurcharges', () => ({
  usePaymentSurcharges: (options: unknown) => {
    queryOptions(options);
    return state.query;
  },
  useUpdatePaymentSurcharges: () => state.update,
}));
vi.mock('../../../services/queries/users', () => ({ useUser: () => ({ data: undefined, isPending: false }) }));
vi.mock('../../../utils/notifications', () => ({ notify, confirm }));

const defaults = {
  transferPercentage: 10,
  mercadoPagoPercentage: 10,
  cashPercentage: 0,
  isDefault: true,
  updatedAt: null,
  updatedByUserId: null,
};

const setup = (data: Record<string, unknown> = defaults) => {
  state.query = ok(data);
  state.update = mutation();
  render(<PaymentSurchargesCard />);
  return state.update as ReturnType<typeof mutation>;
};

afterEach(() => {
  cleanup();
  queryOptions.mockReset();
  notify.success.mockReset();
  confirm.mockReset();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
});

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => screen.getByRole('button', { name: 'Guardar recargos' });

describe('PaymentSurchargesCard', () => {
  it('muestra los tres porcentajes, la explicación y no deja guardar sin cambios', () => {
    setup({ ...defaults, transferPercentage: 7.5, isDefault: false });
    expect(screen.getByLabelText('Transferencia (%)')).toHaveValue('7.5');
    expect(screen.getByLabelText('Mercado Pago (%)')).toHaveValue('10');
    expect(screen.getByLabelText('Efectivo (%)')).toHaveValue('0');
    expect(screen.getByText(/el cliente lo ve antes de confirmar/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('guarda los tres porcentajes como número (con coma decimal) y avisa', async () => {
    const update = setup();
    type('Transferencia (%)', '7,5');
    type('Efectivo (%)', '2.25');
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const [body, options] = update.mutate.mock.calls[0] as [unknown, { onSuccess: (saved: unknown) => void }];
    expect(body).toEqual({ transferPercentage: 7.5, mercadoPagoPercentage: 10, cashPercentage: 2.25 });
    options.onSuccess({ ...defaults, transferPercentage: 7.5, cashPercentage: 2.25, isDefault: false });
    expect(notify.success).toHaveBeenCalledWith('Recargos por medio de pago guardados');
  });

  it.each([
    ['31', 'Tiene que estar entre 0 y 30'],
    ['10.123', 'Hasta 2 decimales'],
    ['', 'Ingresá un porcentaje, por ejemplo 7,5'],
  ])('un porcentaje de %p muestra el error y bloquea el guardado', async (raw, message) => {
    const update = setup();
    type('Mercado Pago (%)', raw);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(save()).toBeDisabled();
    expect(update.mutate).not.toHaveBeenCalled();
  });

  it('muestra el mensaje que devuelve el back', async () => {
    const update = setup();
    type('Transferencia (%)', '5');
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const [, options] = update.mutate.mock.calls[0] as [unknown, { onError: (e: Error) => void }];
    options.onError(new ApiError(400, ['transferPercentage must not be greater than 30']));
    expect(await screen.findByRole('alert')).toHaveTextContent('transferPercentage must not be greater than 30');
  });

  it('restablecer pide confirmación y manda los tres valores por defecto (10, 10 y 0)', async () => {
    confirm.mockResolvedValue(true);
    const update = setup({ ...defaults, transferPercentage: 7.5, isDefault: false });
    fireEvent.click(screen.getByRole('button', { name: /Restablecer valores por defecto/ }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toEqual({
      transferPercentage: 10,
      mercadoPagoPercentage: 10,
      cashPercentage: 0,
    });
  });

  it('sin permiso de escritura los campos quedan deshabilitados', () => {
    state.perms.canWrite = false;
    setup();
    expect(screen.getByLabelText('Transferencia (%)')).toBeDisabled();
    expect(save()).toBeDisabled();
  });

  it('sin distribuidora elegida pide «Ver como» y no consulta', () => {
    state.perms.needsDistributor = true;
    setup();
    expect(screen.getByText(/Elegí una distribuidora/)).toBeInTheDocument();
    expect(queryOptions).toHaveBeenCalledWith({ enabled: false });
  });

  it('si la consulta falla ofrece reintentar', () => {
    state.query = failed();
    state.update = mutation();
    render(<PaymentSurchargesCard />);
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});
