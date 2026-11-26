import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { renderRoutes } from '../../test/renderRoutes';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok } from '../../test/pageTest';
import type { Delivery } from '../../services/api/types';

const permissions = vi.hoisted(() => ({ canOperate: true, isSuperAdmin: false }));
const queries = vi.hoisted(() => ({ delivery: vi.fn(), create: vi.fn(), account: vi.fn(), validate: vi.fn() }));
const accountFree = vi.hoisted(() => vi.fn());
const notifySuccess = vi.hoisted(() => vi.fn());

vi.mock('../../utils/notifications', () => ({
  notify: { success: notifySuccess, error: vi.fn(), info: vi.fn() },
  confirm: vi.fn(),
  dismissConfirm: vi.fn(),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    canOperate: permissions.canOperate,
    isSuperAdmin: permissions.isSuperAdmin,
    operateHint: permissions.canOperate ? undefined : 'Elegí una distribuidora en «Ver como» para operar',
  }),
}));
vi.mock('../../common/forms/checkAccountFree', () => ({ checkAccountFree: accountFree }));
vi.mock('../../services/queries/deliveries', () => ({
  useDelivery: (...args: unknown[]) => queries.delivery(...args) as unknown,
  useCreateDelivery: () => queries.create() as unknown,
  useDistributorOptions: () => ({ data: [{ distributor_id: 'd-1', name: 'Gas del Norte' }] }),
  useUpdateDeliveryAccount: () => queries.account() as unknown,
  useValidateDelivery: () => queries.validate() as unknown,
  useInvalidateDelivery: () => mutation(),
  useSetDeliveryEnabled: () => mutation(),
}));

import { DeliveryForm } from './DeliveryForm';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  permissions.canOperate = true;
  permissions.isSuperAdmin = false;
});

const DELIVERY = {
  delivery_id: 'dl-1',
  user_id: 'u-1',
  user: { full_name: 'Luis Gómez', email: 'luis@x.com', phone_number: '+5493764000000' },
  validated: false,
  isEnabled: true,
} as unknown as Delivery;

const renderAt = (url: string) =>
  renderRoutes(
    <>
      <Route path="/deliveries/new" element={<DeliveryForm />} />
      <Route path="/deliveries/:id/edit" element={<DeliveryForm />} />
      <Route path="/deliveries" element={<p>lista de choferes</p>} />
      <Route path="/deliveries/details/:id" element={<p>ficha del chofer</p>} />
    </>,
    [url],
  );

const setup = () => {
  queries.delivery.mockReturnValue(ok(undefined));
  accountFree.mockResolvedValue(true);
  const create = mutation({
    mutate: vi.fn((_body: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.()),
  });
  const account = mutation({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
  queries.create.mockReturnValue(create);
  queries.account.mockReturnValue(account);
  queries.validate.mockReturnValue(mutation({ mutateAsync: vi.fn().mockResolvedValue(undefined) }));
  return { create, account };
};

describe('DeliveryForm', () => {
  it('el alta se arma en secciones; la empresa sólo la ve el administrador general', () => {
    setup();
    renderAt('/deliveries/new');
    expect(screen.getByRole('heading', { level: 1, name: 'Nuevo chofer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Datos del chofer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Contraseña' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Empresa/)).not.toBeInTheDocument();
    cleanup();
    permissions.isSuperAdmin = true;
    renderAt('/deliveries/new');
    expect(screen.getByLabelText(/Empresa/)).toBeInTheDocument();
  });

  it('enviar vacío muestra los errores, enfoca el primero y no consulta ni crea', async () => {
    const { create } = setup();
    renderAt('/deliveries/new');
    fireEvent.click(screen.getByRole('button', { name: 'Crear chofer' }));
    expect(await screen.findByText('Ingresá el nombre completo')).toBeInTheDocument();
    expect(screen.getByText('Email inválido')).toBeInTheDocument();
    expect(
      screen.getByText('Entre 8 y 128 caracteres, con una mayúscula, una minúscula y un número'),
    ).toBeInTheDocument();
    expect(accountFree).not.toHaveBeenCalled();
    expect(create.mutate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText(/^Nombre completo/)).toHaveFocus());
  });

  it('las contraseñas tienen que coincidir', async () => {
    const { create } = setup();
    renderAt('/deliveries/new');
    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Luis Gómez' } });
    fireEvent.change(screen.getByLabelText(/^Teléfono/), { target: { value: '+5493764000000' } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'luis@x.com' } });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Ejemplo2026x' } });
    fireEvent.change(screen.getByLabelText(/^Repetir contraseña/), { target: { value: 'Otra1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear chofer' }));
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('manda el mismo cuerpo que el modal (pendiente de validar, habilitado) y vuelve a la lista', async () => {
    const { create } = setup();
    renderAt('/deliveries/new');
    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Luis Gómez' } });
    fireEvent.change(screen.getByLabelText(/^Teléfono/), { target: { value: '+5493764000000' } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'luis@x.com' } });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Ejemplo2026x' } });
    fireEvent.change(screen.getByLabelText(/^Repetir contraseña/), { target: { value: 'Ejemplo2026x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear chofer' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(create.mutate.mock.calls[0][0]).toEqual({
      full_name: 'Luis Gómez',
      phone_number: '+5493764000000',
      email: 'luis@x.com',
      password: 'Ejemplo2026x',
      distributorId: undefined,
      validated: false,
      isActive: true,
    });
    expect(await screen.findByText('lista de choferes')).toBeInTheDocument();
    expect(notifySuccess).toHaveBeenCalledWith('Chofer creado');
  });

  it('si el correo ya tiene cuenta no crea nada', async () => {
    const { create } = setup();
    accountFree.mockResolvedValue(false);
    renderAt('/deliveries/new');
    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Luis Gómez' } });
    fireEvent.change(screen.getByLabelText(/^Teléfono/), { target: { value: '+5493764000000' } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'luis@x.com' } });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Ejemplo2026x' } });
    fireEvent.change(screen.getByLabelText(/^Repetir contraseña/), { target: { value: 'Ejemplo2026x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear chofer' }));
    await waitFor(() => expect(accountFree).toHaveBeenCalled());
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('la edición manda sólo lo que cambió y vuelve a la ficha', async () => {
    const { account } = setup();
    queries.delivery.mockReturnValue(ok(DELIVERY));
    renderAt('/deliveries/dl-1/edit');
    expect(screen.getByRole('heading', { level: 1, name: 'Editar chofer' })).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Luis G. Gómez' } });
    fireEvent.click(save);
    await waitFor(() => expect(account.mutateAsync).toHaveBeenCalled());
    expect(account.mutateAsync).toHaveBeenCalledWith({
      userId: 'u-1',
      changes: { full_name: 'Luis G. Gómez', phone_number: '+5493764000000' },
    });
    expect(await screen.findByText('ficha del chofer')).toBeInTheDocument();
    expect(notifySuccess).toHaveBeenCalledWith('Chofer actualizado');
  });

  it('al pasar de la edición de un chofer a la de otro, guarda con el id del segundo', async () => {
    const { account } = setup();
    const other = {
      ...DELIVERY,
      delivery_id: 'dl-2',
      user_id: 'u-2',
      user: { full_name: 'Marta Díaz', email: 'm@x.com', phone_number: '+5493764111111' },
    } as unknown as Delivery;
    queries.delivery.mockImplementation((id: string) => ok(id === 'dl-1' ? DELIVERY : other));
    const { router } = renderAt('/deliveries/dl-1/edit');
    expect(screen.getByLabelText(/^Nombre completo/)).toHaveValue('Luis Gómez');
    await act(() => router.navigate('/deliveries/dl-2/edit'));
    await waitFor(() => expect(screen.getByLabelText(/^Nombre completo/)).toHaveValue('Marta Díaz'));
    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Marta D.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(account.mutateAsync).toHaveBeenCalled());
    expect(account.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-2' }));
  });

  it('carga y error al traer el chofer', () => {
    setup();
    queries.delivery.mockReturnValue(loading());
    renderAt('/deliveries/dl-1/edit');
    expect(screen.getByRole('status')).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    queries.delivery.mockReturnValue(failed(refetch));
    renderAt('/deliveries/dl-1/edit');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('un error de recarga con el chofer en caché no desmonta el formulario: avisa en línea y reintenta', () => {
    setup();
    const refetch = vi.fn();
    queries.delivery.mockReturnValue({ ...ok(DELIVERY), error: new Error('boom'), isError: true, refetch });
    renderAt('/deliveries/dl-1/edit');
    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Cambio sin guardar' } });
    expect(screen.getByLabelText(/^Nombre completo/)).toHaveValue('Cambio sin guardar');
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos actualizar el chofer');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('editar sin distribuidora elegida no muestra el formulario', () => {
    setup();
    permissions.canOperate = false;
    renderAt('/deliveries/dl-1/edit');
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
  });
});
