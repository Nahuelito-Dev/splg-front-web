import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import { failed, mutation, ok } from '../../../test/pageTest';
import { BankDetailsCard } from './BankDetailsCard';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  query: undefined as unknown,
  update: undefined as unknown,
}));
const queryOptions = vi.hoisted(() => vi.fn());
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../../services/queries/bankDetails', () => ({
  useBankDetails: (options: unknown) => {
    queryOptions(options);
    return state.query;
  },
  useUpdateBankDetails: () => state.update,
}));
vi.mock('../../../utils/notifications', () => ({ notify }));

const VALID_CBU = '0170099220000067797370';
const details = { cbu: null, alias: null, holder: null };

const setup = (data: Record<string, unknown> = details) => {
  state.query = ok(data);
  state.update = mutation();
  render(<BankDetailsCard />);
  return state.update as ReturnType<typeof mutation>;
};

afterEach(() => {
  cleanup();
  queryOptions.mockReset();
  notify.success.mockReset();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
});

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => screen.getByRole('button', { name: 'Guardar datos bancarios' });

describe('BankDetailsCard', () => {
  it('muestra lo cargado y no deja guardar sin cambios', () => {
    setup({ cbu: VALID_CBU, alias: 'garrafas.splg', holder: 'Demo S.A.' });
    expect(screen.getByLabelText('CBU')).toHaveValue(VALID_CBU);
    expect(screen.getByLabelText('Alias')).toHaveValue('garrafas.splg');
    expect(screen.getByLabelText('Titular de la cuenta')).toHaveValue('Demo S.A.');
    expect(save()).toBeDisabled();
  });

  it('un CBU inválido muestra el error y bloquea el guardado', async () => {
    const update = setup();
    type('CBU', '0170099220000067797371');
    expect(await screen.findByText('El CBU no es válido: revisá los dígitos')).toBeInTheDocument();
    expect(save()).toBeDisabled();
    expect(update.mutate).not.toHaveBeenCalled();
  });

  it('un alias corto muestra el error', async () => {
    setup();
    type('Alias', 'abc');
    expect(await screen.findByText(/El alias lleva de 6 a 20/)).toBeInTheDocument();
  });

  it('guarda con null en lo vacío y avisa', async () => {
    const update = setup();
    type('CBU', VALID_CBU);
    type('Titular de la cuenta', 'Demo S.A.');
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const [body, options] = update.mutate.mock.calls[0] as [unknown, { onSuccess: (saved: unknown) => void }];
    expect(body).toEqual({ cbu: VALID_CBU, alias: null, holder: 'Demo S.A.' });
    options.onSuccess({ cbu: VALID_CBU, alias: null, holder: 'Demo S.A.' });
    expect(notify.success).toHaveBeenCalledWith('Datos bancarios guardados');
  });

  it('muestra el mensaje que devuelve el back', async () => {
    const update = setup();
    type('Alias', 'alias.ok');
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const [, options] = update.mutate.mock.calls[0] as [unknown, { onError: (e: Error) => void }];
    options.onError(new ApiError(400, ['cbu tiene que ser un CBU de 22 dígitos']));
    expect(await screen.findByRole('alert')).toHaveTextContent('cbu tiene que ser un CBU de 22 dígitos');
  });

  it('sin permiso de escritura los campos quedan deshabilitados', () => {
    state.perms.canWrite = false;
    setup();
    expect(screen.getByLabelText('CBU')).toBeDisabled();
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
    render(<BankDetailsCard />);
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});
