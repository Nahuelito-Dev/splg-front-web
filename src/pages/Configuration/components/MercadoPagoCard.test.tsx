import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import { failed, mutation, ok } from '../../../test/pageTest';
import { MercadoPagoCard } from './MercadoPagoCard';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  query: undefined as unknown,
  save: undefined as unknown,
  deactivate: undefined as unknown,
  confirmed: true,
}));
const queryOptions = vi.hoisted(() => vi.fn());
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../../services/queries/mercadoPagoCredentials', () => ({
  useMercadoPagoCredentials: (options: unknown) => {
    queryOptions(options);
    return state.query;
  },
  useSaveMercadoPagoCredentials: () => state.save,
  useDeactivateMercadoPagoCredentials: () => state.deactivate,
}));
vi.mock('../../../utils/notifications', () => ({
  notify,
  confirm: () => Promise.resolve(state.confirmed),
}));

const system = {
  source: 'system',
  active: false,
  encryptionConfigured: true,
  accessTokenMasked: null,
  publicKeyMasked: null,
  webhookSecretMasked: null,
  verifiedAt: null,
};
const own = {
  source: 'own',
  active: true,
  encryptionConfigured: true,
  accessTokenMasked: 'APP_USR-…1234',
  publicKeyMasked: 'APP_USR-…abcd',
  webhookSecretMasked: '••••wxyz',
  verifiedAt: '2026-10-31T15:00:00.000Z',
};

const setup = (data: Record<string, unknown> = system) => {
  state.query = ok(data);
  state.save = mutation();
  state.deactivate = mutation();
  render(<MercadoPagoCard />);
  return {
    save: state.save as ReturnType<typeof mutation>,
    deactivate: state.deactivate as ReturnType<typeof mutation>,
  };
};

afterEach(() => {
  cleanup();
  queryOptions.mockReset();
  notify.success.mockReset();
  notify.error.mockReset();
  state.confirmed = true;
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
});

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const fillAll = () => {
  type('Access token', 'APP_USR-nuevo-0000');
  type('Clave pública', 'APP_USR-publica');
  type('Secreto del webhook', 'secreto-nuevo');
};
const save = (name = 'Guardar cuenta') => screen.getByRole('button', { name });

describe('MercadoPagoCard', () => {
  it('sin cuenta propia explica que se cobra con la del sistema', () => {
    setup();
    expect(screen.getByText('Cuenta del sistema')).toBeInTheDocument();
    expect(screen.getByText(/se hacen con la cuenta del sistema/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver a la cuenta del sistema' })).not.toBeInTheDocument();
  });

  it('los campos son de tipo contraseña y arrancan vacíos', () => {
    setup(own);
    for (const label of ['Access token', 'Clave pública', 'Secreto del webhook']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText(label)).toHaveValue('');
    }
    expect(save('Reemplazar cuenta')).toBeDisabled();
  });

  it('con cuenta propia muestra sólo lo enmascarado', () => {
    setup(own);
    expect(screen.getByText('Cuenta propia')).toBeInTheDocument();
    expect(screen.getByText('APP_USR-…1234')).toBeInTheDocument();
    expect(screen.getByText('••••wxyz')).toBeInTheDocument();
  });

  it('no deja guardar con datos incompletos', () => {
    setup();
    type('Access token', 'APP_USR-nuevo-0000');
    expect(save()).toBeDisabled();
  });

  it('guarda los tres datos, limpia el formulario y avisa', async () => {
    const { save: mutate } = setup();
    fillAll();
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(mutate.mutate).toHaveBeenCalled());
    const [body, options] = mutate.mutate.mock.calls[0] as [unknown, { onSuccess: () => void }];
    expect(body).toEqual({
      accessToken: 'APP_USR-nuevo-0000',
      publicKey: 'APP_USR-publica',
      webhookSecret: 'secreto-nuevo',
    });
    options.onSuccess();
    expect(notify.success).toHaveBeenCalledWith('Cuenta de Mercado Pago guardada');
    await waitFor(() => expect(screen.getByLabelText('Access token')).toHaveValue(''));
  });

  it('si Mercado Pago rechaza el token muestra el mensaje del back', async () => {
    const { save: mutate } = setup();
    fillAll();
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(mutate.mutate).toHaveBeenCalled());
    const [, options] = mutate.mutate.mock.calls[0] as [unknown, { onError: (e: Error) => void }];
    options.onError(new ApiError(422, ['Mercado Pago rechazó el access token: no se guardó nada']));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mercado Pago rechazó el access token');
  });

  it('desactivar pide confirmación y vuelve a la cuenta del sistema', async () => {
    const { deactivate } = setup(own);
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la cuenta del sistema' }));
    await waitFor(() => expect(deactivate.mutate).toHaveBeenCalled());
  });

  it('si no se confirma, no desactiva', async () => {
    state.confirmed = false;
    const { deactivate } = setup(own);
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la cuenta del sistema' }));
    await Promise.resolve();
    expect(deactivate.mutate).not.toHaveBeenCalled();
  });

  it('sin la clave de cifrado en el servidor avisa y bloquea la carga', () => {
    setup({ ...system, encryptionConfigured: false });
    expect(screen.getByRole('alert')).toHaveTextContent(/falta la clave de cifrado/);
    expect(screen.getByLabelText('Access token')).toBeDisabled();
  });

  it('sin permiso de escritura los campos quedan deshabilitados', () => {
    state.perms.canWrite = false;
    setup(own);
    expect(screen.getByLabelText('Access token')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Volver a la cuenta del sistema' })).toBeDisabled();
  });

  it('sin distribuidora elegida pide «Ver como» y no consulta', () => {
    state.perms.needsDistributor = true;
    setup();
    expect(screen.getByText(/Elegí una distribuidora/)).toBeInTheDocument();
    expect(queryOptions).toHaveBeenCalledWith({ enabled: false });
  });

  it('si la consulta falla ofrece reintentar', () => {
    state.query = failed();
    state.save = mutation();
    state.deactivate = mutation();
    render(<MercadoPagoCard />);
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});
