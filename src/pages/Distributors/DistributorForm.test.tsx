import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { renderRoutes } from '../../test/renderRoutes';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok } from '../../test/pageTest';
import type { Distributor } from '../../services/api/types';

const permissions = vi.hoisted(() => ({ isSuperAdmin: true }));
const queries = vi.hoisted(() => ({ distributor: vi.fn(), create: vi.fn(), update: vi.fn() }));
const notifySuccess = vi.hoisted(() => vi.fn());

vi.mock('../../utils/notifications', () => ({
  notify: { success: notifySuccess, error: vi.fn(), info: vi.fn() },
  confirm: vi.fn(),
  dismissConfirm: vi.fn(),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ isSuperAdmin: permissions.isSuperAdmin }),
}));
vi.mock('../../services/queries/distributors', () => ({
  useDistributor: (...args: unknown[]) => queries.distributor(...args) as unknown,
  useCreateDistributor: () => queries.create() as unknown,
  useUpdateDistributor: () => queries.update() as unknown,
}));

import { DistributorForm } from './DistributorForm';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  permissions.isSuperAdmin = true;
});

const DISTRIBUTOR = {
  distributor_id: 'd-1',
  name: 'Gas del Norte',
  slug: 'gas-del-norte',
  legal_name: null,
  tax_id: null,
  email: null,
  phone: null,
  logo_url: 'https://cdn.example/logo.png',
  photoUrl: 'https://splg.s3.amazonaws.com/distributors/d-1/logo.png?X-Amz-Signature=abc',
} as unknown as Distributor;

const renderAt = (url: string) =>
  renderRoutes(
    <>
      <Route path="/distributors/new" element={<DistributorForm />} />
      <Route path="/distributors/:id/edit" element={<DistributorForm />} />
      <Route path="/distributors/:id" element={<p>ficha de la empresa</p>} />
      <Route path="/distributors" element={<p>lista de empresas</p>} />
    </>,
    [url],
  );

const setup = () => {
  queries.distributor.mockReturnValue(ok(undefined));
  const create = mutation({
    mutate: vi.fn((_body: unknown, options?: { onSuccess?: (d: unknown) => void }) =>
      options?.onSuccess?.({ distributor_id: 'd-9' }),
    ),
  });
  const update = mutation({
    mutate: vi.fn((_vars: unknown, options?: { onSuccess?: (d: unknown) => void }) =>
      options?.onSuccess?.(DISTRIBUTOR),
    ),
  });
  queries.create.mockReturnValue(create);
  queries.update.mockReturnValue(update);
  return { create, update };
};

describe('DistributorForm', () => {
  it('el alta tiene el slug y las secciones', () => {
    setup();
    renderAt('/distributors/new');
    expect(screen.getByRole('heading', { level: 1, name: 'Nueva empresa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Datos de la empresa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Contacto' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Slug/)).toBeInTheDocument();
  });

  it('enviar vacío muestra los errores, enfoca el primero y no llama a la API', async () => {
    const { create } = setup();
    renderAt('/distributors/new');
    fireEvent.click(screen.getByRole('button', { name: 'Crear empresa' }));
    expect(await screen.findByText(/Ingresá el nombre/)).toBeInTheDocument();
    expect(screen.getByText('Mínimo 2 caracteres')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText(/^Nombre/)).toHaveFocus());
  });

  it('el slug y los largos se validan como en el DTO del back', async () => {
    const { create } = setup();
    renderAt('/distributors/new');
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Jeny Gas' } });
    fireEvent.change(screen.getByLabelText(/^Slug/), { target: { value: 'Jeny Gas' } });
    fireEvent.change(screen.getByLabelText(/^CUIT/), { target: { value: '3'.repeat(21) } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear empresa' }));
    expect(await screen.findByText(/Minúsculas, números y guiones \(ej/)).toBeInTheDocument();
    expect(screen.getByText('El CUIT tiene que tener 11 dígitos')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('manda el mismo cuerpo que el modal (vacíos sin enviar) y va a la ficha de la empresa creada', async () => {
    const { create } = setup();
    renderAt('/distributors/new');
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Jeny Gas' } });
    fireEvent.change(screen.getByLabelText(/^Slug/), { target: { value: 'jeny-gas' } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'hola@jeny.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear empresa' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(create.mutate.mock.calls[0][0]).toEqual({
      name: 'Jeny Gas',
      slug: 'jeny-gas',
      legal_name: undefined,
      tax_id: undefined,
      email: 'hola@jeny.com',
      phone: undefined,
    });
    expect(await screen.findByText('ficha de la empresa')).toBeInTheDocument();
    expect(notifySuccess).toHaveBeenCalledWith('Empresa creada');
  });

  it('la edición no tiene slug, nunca reenvía photoUrl ni logo_url y vuelve a la ficha', async () => {
    const { update } = setup();
    queries.distributor.mockReturnValue(ok(DISTRIBUTOR));
    renderAt('/distributors/d-1/edit');
    expect(screen.queryByLabelText(/^Slug/)).not.toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Gas del Norte SRL' } });
    fireEvent.click(save);
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const { id, changes } = update.mutate.mock.calls[0][0] as { id: string; changes: Record<string, unknown> };
    expect(id).toBe('d-1');
    expect(changes).not.toHaveProperty('photoUrl');
    expect(changes).not.toHaveProperty('logo_url');
    expect(JSON.stringify(changes)).not.toContain('X-Amz-Signature');
    expect(changes).toMatchObject({ name: 'Gas del Norte SRL' });
    expect(await screen.findByText('ficha de la empresa')).toBeInTheDocument();
  });

  it('al pasar de la edición de una empresa a la de otra, guarda con el id de la segunda', async () => {
    const { update } = setup();
    const other = { ...DISTRIBUTOR, distributor_id: 'd-2', name: 'Gas del Sur', slug: 'gas-del-sur' } as Distributor;
    queries.distributor.mockImplementation((id: string) => ok(id === 'd-1' ? DISTRIBUTOR : other));
    const { router } = renderAt('/distributors/d-1/edit');
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Gas del Norte');
    await act(() => router.navigate('/distributors/d-2/edit'));
    await waitFor(() => expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Gas del Sur'));
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Gas del Sur SRL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toMatchObject({ id: 'd-2', changes: { name: 'Gas del Sur SRL' } });
  });

  it('carga y error al traer la empresa', () => {
    setup();
    queries.distributor.mockReturnValue(loading());
    renderAt('/distributors/d-1/edit');
    expect(screen.getByRole('status')).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    queries.distributor.mockReturnValue(failed(refetch));
    renderAt('/distributors/d-1/edit');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('un error de recarga con la empresa en caché no desmonta el formulario: avisa en línea y reintenta', () => {
    setup();
    const refetch = vi.fn();
    queries.distributor.mockReturnValue({ ...ok(DISTRIBUTOR), error: new Error('boom'), isError: true, refetch });
    renderAt('/distributors/d-1/edit');
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Cambio sin guardar' } });
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Cambio sin guardar');
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos actualizar la empresa');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('quien no es administrador general no ve el formulario', () => {
    setup();
    permissions.isSuperAdmin = false;
    renderAt('/distributors/new');
    expect(screen.getByText('Sin acceso')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Slug/)).not.toBeInTheDocument();
  });
});
