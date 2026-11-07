import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adjustCustomerContainers } from '../../../../services/api/customerContainers';
import { queryKeys } from '../../../../services/queries/queryKeys';

vi.mock('../../../../services/api/customerContainers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  adjustCustomerContainers: vi.fn(),
}));
const notifySuccess = vi.hoisted(() => vi.fn());
vi.mock('../../../../utils/notifications', async (importOriginal) => {
  const original = await importOriginal<{ notify: Record<string, unknown> }>();
  return { ...original, notify: { ...original.notify, success: notifySuccess } };
});

import { ContainerAdjustModal } from './ContainerAdjustModal';

const ACCOUNTS = [
  { gasCylinderId: 'g-10', type: '10kg', owned: 2, loanedByM5: 0, isActive: true },
  { gasCylinderId: 'g-45', type: '45kg', owned: 1, loanedByM5: 0, isActive: false },
];

/** Un error de la API como lo arma axios: estado y cuerpo del filtro global de Nest. */
const apiError = (status: number, message: string | string[]) =>
  new AxiosError('fail', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { statusCode: status, message },
  });

const adjust = vi.mocked(adjustCustomerContainers);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const draw = (onClose = vi.fn()) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <ContainerAdjustModal open onClose={onClose} customerId="c-1" accounts={ACCOUNTS} />
    </QueryClientProvider>,
  );
  return { onClose, invalidate };
};

const fill = ({ type = 'g-10', direction = 'Sumar', count = '2', note = 'Conteo en el domicilio' } = {}) => {
  fireEvent.change(screen.getByLabelText(/Tipo de garrafa/), { target: { value: type } });
  fireEvent.click(screen.getByLabelText(direction));
  fireEvent.change(screen.getByLabelText(/Cantidad/), { target: { value: count } });
  fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: note } });
};
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar ajuste' }));

describe('ContainerAdjustModal', () => {
  it('ofrece los tipos de la cuenta y marca el dado de baja', () => {
    draw();
    expect(screen.getByRole('option', { name: '10kg' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '45kg (dado de baja)' })).toBeInTheDocument();
  });

  it('«Sumar» manda la cantidad positiva, con la nota recortada y una clave de idempotencia', async () => {
    adjust.mockResolvedValue({ ...ACCOUNTS[0], owned: 4 });
    const { onClose, invalidate } = draw();
    fill({ note: '   Conteo en el domicilio   ' });
    save();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(adjust).toHaveBeenCalledWith(
      'c-1',
      { gasCylinderId: 'g-10', quantity: 2, note: 'Conteo en el domicilio' },
      expect.any(String),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Envases de 10kg ajustados: ahora tiene 4 propios');
    // Al guardar se refrescan la tarjeta y el historial.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.customerContainers.all });
  });

  it('«Restar» manda la cantidad negativa', async () => {
    adjust.mockResolvedValue({ ...ACCOUNTS[1], owned: 0 });
    draw();
    fill({ type: 'g-45', direction: 'Restar', count: '1' });
    save();
    await waitFor(() => expect(adjust).toHaveBeenCalledOnce());
    expect(adjust.mock.calls[0][1]).toEqual({ gasCylinderId: 'g-45', quantity: -1, note: 'Conteo en el domicilio' });
  });

  it('el motivo se valida recortado: 10 caracteres rodeados de espacios no alcanzan si son menos sin ellos', async () => {
    draw();
    fill({ note: '    corto     ' });
    save();
    expect(await screen.findByText('Escribí el motivo del ajuste (al menos 10 caracteres)')).toBeInTheDocument();
    expect(adjust).not.toHaveBeenCalled();
  });

  it('una cantidad de 0 no se envía', async () => {
    draw();
    fill({ count: '0' });
    save();
    expect(await screen.findByText('La cantidad tiene que ser al menos 1')).toBeInTheDocument();
    expect(adjust).not.toHaveBeenCalled();
  });

  it('el 409 del back se muestra en el modal, que queda abierto', async () => {
    adjust.mockRejectedValue(apiError(409, 'El cliente quedaría con envases negativos'));
    const { onClose } = draw();
    fill({ direction: 'Restar', count: '5' });
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('El cliente quedaría con envases negativos');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('el 400 de validación del back se muestra en el modal', async () => {
    adjust.mockRejectedValue(apiError(400, ['Nota: tiene que tener al menos 10 caracteres']));
    draw();
    fill();
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Nota: tiene que tener al menos 10 caracteres');
  });

  it('un doble clic en «Guardar ajuste» manda un solo ajuste', async () => {
    let resolve: (value: (typeof ACCOUNTS)[number]) => void = () => undefined;
    adjust.mockReturnValue(new Promise((r) => (resolve = r)));
    const { onClose } = draw();
    fill();
    save();
    save();
    await waitFor(() => expect(adjust).toHaveBeenCalled());
    // Se deja pasar la validación del segundo clic antes de contar.
    await new Promise((r) => setTimeout(r, 20));
    expect(adjust).toHaveBeenCalledOnce();
    resolve({ ...ACCOUNTS[0], owned: 4 });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('los radios se anuncian «Sumar» y «Restar»', () => {
    draw();
    expect(screen.getByRole('radio', { name: 'Sumar' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Restar' })).not.toBeChecked();
  });

  it('la cantidad arranca vacía: escribir «5» deja 5, y vacía no se envía', async () => {
    draw();
    const count = screen.getByLabelText(/Cantidad/);
    expect(count).toHaveValue(null);
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Conteo en el domicilio' } });
    save();
    expect(await screen.findByText('Escribí la cantidad')).toBeInTheDocument();
    expect(adjust).not.toHaveBeenCalled();
    fireEvent.change(count, { target: { value: '5' } });
    expect(count).toHaveValue(5);
  });

  it.each([500, 502, 503])('un %i conserva la clave y avisa que no se sabe si se guardó', async (status) => {
    adjust.mockRejectedValueOnce(apiError(status, 'Internal server error'));
    adjust.mockResolvedValueOnce({ ...ACCOUNTS[0], owned: 4 });
    const { onClose } = draw();
    fill();
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No sabemos si el ajuste se guardó: reintentá; no se va a duplicar',
    );
    save();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(adjust.mock.calls[1][2]).toBe(adjust.mock.calls[0][2]);
  });

  it('si no hubo respuesta, reintentar con los mismos datos viaja con la misma clave', async () => {
    adjust.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));
    adjust.mockResolvedValueOnce({ ...ACCOUNTS[0], owned: 4 });
    const { onClose } = draw();
    fill();
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('No sabemos si el ajuste se guardó');
    save();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(adjust).toHaveBeenCalledTimes(2);
    expect(adjust.mock.calls[1][2]).toBe(adjust.mock.calls[0][2]);
  });

  it.each([
    [400, 'Nota: tiene que tener al menos 10 caracteres'],
    [404, 'Tipo de garrafa no encontrado'],
    [409, 'El cliente quedaría con envases negativos'],
  ])('después de un %i (rechazo definitivo), el próximo intento va con otra clave', async (status, message) => {
    adjust.mockRejectedValueOnce(apiError(status, message));
    adjust.mockResolvedValueOnce({ ...ACCOUNTS[0], owned: 4 });
    draw();
    fill();
    save();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    save();
    await waitFor(() => expect(adjust).toHaveBeenCalledTimes(2));
    expect(adjust.mock.calls[1][2]).not.toBe(adjust.mock.calls[0][2]);
  });
});
