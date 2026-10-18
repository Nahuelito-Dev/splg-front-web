import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { failed, mutation, ok } from '../../test/pageTest';
import { AutomaticProcesses } from './AutomaticProcesses';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  query: undefined as unknown,
  update: undefined as unknown,
}));
vi.mock('../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../services/queries/moduleConfig', () => ({
  useProcessConfigs: () => state.query,
  useUpdateProcessConfig: () => state.update,
}));
vi.mock('../../services/queries/users', () => ({
  useUser: () => ({ data: { full_name: 'Ana Admin' }, isPending: false }),
}));
const confirmed = vi.hoisted(() => ({ value: true }));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirm: () => Promise.resolve(confirmed.value),
  notify: { success: vi.fn(), error: vi.fn() },
}));

const field = (key: string, description: string, over: Record<string, unknown> = {}) => ({
  key,
  type: 'integer',
  min: 1,
  max: 30,
  default: 3,
  unit: 'días',
  description,
  ...over,
});

const processes = (over: Record<string, unknown> = {}) => [
  {
    process: 'repurchase',
    title: 'Anticipación de recompra',
    description: 'Estima cuándo se le acaba la garrafa a cada cliente.',
    fields: [
      field('anticipationDays', 'Anticipación (días)'),
      field('minOrders', 'Pedidos mínimos', { min: 2, max: 50 }),
    ],
    params: { anticipationDays: 3, minOrders: 3 },
    isDefault: true,
    updatedAt: null,
    updatedByUserId: null,
    ...over,
  },
  {
    process: 'express_dispatch',
    title: 'Despacho express',
    description: 'Compra express en moto.',
    fields: [
      field('serviceStartHour', 'Inicio del servicio', { min: 0, max: 23, default: 8, unit: 'h' }),
      field('serviceEndHour', 'Fin del servicio', { min: 1, max: 24, default: 20, unit: 'h' }),
    ],
    params: { serviceStartHour: 8, serviceEndHour: 20 },
    isDefault: false,
    updatedAt: '2026-10-15T12:00:00.000Z',
    updatedByUserId: 'user-1',
  },
];

const setup = (data = processes()) => {
  state.query = ok(data);
  state.update = mutation();
  render(
    <MemoryRouter>
      <AutomaticProcesses />
    </MemoryRouter>,
  );
  return state.update as ReturnType<typeof mutation>;
};

afterEach(() => {
  cleanup();
  confirmed.value = true;
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
});

const open = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const save = () => screen.getByRole('button', { name: 'Guardar cambios' });

describe('AutomaticProcesses', () => {
  it('lista los procesos con su estado', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Anticipación de recompra' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Despacho express' })).toBeInTheDocument();
    expect(screen.getByText('Valores por defecto')).toBeInTheDocument();
    expect(screen.getByText('Configurado')).toBeInTheDocument();
  });

  it('pide la distribuidora al administrador general sin «Ver como»', () => {
    state.perms = { needsDistributor: true, canWrite: false, writeHint: undefined };
    state.query = ok(undefined, { isPending: true });
    state.update = mutation();
    render(
      <MemoryRouter>
        <AutomaticProcesses />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /Configurar/ })).not.toBeInTheDocument();
  });

  it('si la carga falla, ofrece reintentar', () => {
    const refetch = vi.fn();
    state.query = failed(refetch);
    state.update = mutation();
    render(
      <MemoryRouter>
        <AutomaticProcesses />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
  });

  it('abre un proceso con sus campos y sin cambios no deja guardar', async () => {
    setup();
    open('Configurar Anticipación de recompra');
    expect(await screen.findByLabelText('Anticipación (días)')).toHaveValue(3);
    expect(screen.getByLabelText('Pedidos mínimos')).toHaveValue(3);
    expect(save()).toBeDisabled();
  });

  it('guarda sólo los parámetros que difieren del valor por omisión', async () => {
    const update = setup();
    open('Configurar Anticipación de recompra');
    fireEvent.change(await screen.findByLabelText('Anticipación (días)'), { target: { value: '5' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toEqual({ process: 'repurchase', body: { anticipationDays: 5 } });
  });

  it('un valor fuera de rango muestra el rango y bloquea guardar', async () => {
    setup();
    open('Configurar Anticipación de recompra');
    fireEvent.change(await screen.findByLabelText('Anticipación (días)'), { target: { value: '99' } });
    expect(await screen.findByText('Un entero entre 1 y 30')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('despacho express: un fin de horario anterior al inicio se marca en el campo', async () => {
    setup();
    open('Configurar Despacho express');
    fireEvent.change(await screen.findByLabelText('Fin del servicio'), { target: { value: '5' } });
    expect(await screen.findByText('Tiene que ser posterior al inicio del servicio')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('muestra el mensaje del back cuando el guardado falla', async () => {
    const update = setup();
    open('Configurar Anticipación de recompra');
    fireEvent.change(await screen.findByLabelText('Anticipación (días)'), { target: { value: '5' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const options = update.mutate.mock.calls[0]?.[1] as { onError: (e: unknown) => void };
    act(() => options.onError(new ApiError(400, ['anticipationDays: tiene que ser un entero entre 1 y 30'])));
    expect(await screen.findByText('anticipationDays: tiene que ser un entero entre 1 y 30')).toBeInTheDocument();
  });

  it('restablecer pide confirmación y manda un cuerpo vacío', async () => {
    const update = setup();
    open('Configurar Despacho express');
    fireEvent.click(await screen.findByRole('button', { name: 'Restablecer valores por defecto' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toEqual({ process: 'express_dispatch', body: {} });
  });

  it('si no se confirma el restablecimiento no manda nada', async () => {
    confirmed.value = false;
    const update = setup();
    open('Configurar Despacho express');
    fireEvent.click(await screen.findByRole('button', { name: 'Restablecer valores por defecto' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(update.mutate).not.toHaveBeenCalled();
  });

  it('sin permiso de escritura los campos van deshabilitados', async () => {
    state.perms = { needsDistributor: false, canWrite: false, writeHint: 'Elegí una distribuidora' };
    setup();
    open('Ver Anticipación de recompra');
    expect(await screen.findByLabelText('Anticipación (días)')).toBeDisabled();
    expect(save()).toBeDisabled();
  });
});
