import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import { failed, mutation, ok } from '../../../test/pageTest';
import { ContainerChargeCard } from './ContainerChargeCard';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  query: undefined as unknown,
  update: undefined as unknown,
  catalog: undefined as unknown,
}));
const queryOptions = vi.hoisted(() => vi.fn());
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../../services/queries/containerCharge', () => ({
  useContainerCharge: (options: unknown) => {
    queryOptions(options);
    return state.query;
  },
  useUpdateContainerCharge: () => state.update,
}));
vi.mock('../../../services/queries/gasCylinders', () => ({ useGasCylinderTypes: () => state.catalog }));
vi.mock('../../../utils/notifications', () => ({ notify }));

const cylinder = (id: string, type: string, container_price: number | null, isActive = true) => ({
  gas_cylinder_id: id,
  type,
  container_price,
  isActive,
});
const catalogOf = (...rows: ReturnType<typeof cylinder>[]) => ok({ rows, total: rows.length });

const setup = (enabled: boolean, over: Record<string, unknown> = {}) => {
  state.query = ok({ enabled });
  state.update = mutation(over);
  render(
    <MemoryRouter>
      <ContainerChargeCard />
    </MemoryRouter>,
  );
  return state.update as ReturnType<typeof mutation>;
};
const toggle = () => screen.getByRole('switch', { name: 'Cobrar los envases que le faltan al cliente' });
type MutateOptions = { onSuccess: (saved: unknown) => void; onError: (e: unknown) => void; onSettled: () => void };
const optionsOf = (update: ReturnType<typeof mutation>, call = 0) =>
  (update.mutate.mock.calls[call] as unknown[])[1] as MutateOptions;

afterEach(() => {
  cleanup();
  queryOptions.mockReset();
  notify.success.mockReset();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
  state.catalog = catalogOf();
});
state.catalog = catalogOf();

describe('ContainerChargeCard', () => {
  it('lee el interruptor del back (apagado por omisión) y explica la regla', () => {
    setup(false);
    expect(queryOptions).toHaveBeenCalledWith({ enabled: true });
    expect(toggle()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/Apagado: canje 1 a 1, como siempre/)).toBeInTheDocument();
  });

  it('muestra encendido lo que dice el back', () => {
    setup(true);
    expect(toggle()).toHaveAttribute('aria-checked', 'true');
  });

  it('enciende con { enabled: true } y avisa al guardar', () => {
    const update = setup(false);
    fireEvent.click(toggle());
    expect(update.mutate).toHaveBeenCalledTimes(1);
    expect((update.mutate.mock.calls[0] as unknown[])[0]).toEqual({ enabled: true });
    optionsOf(update).onSuccess({ enabled: true });
    expect(notify.success).toHaveBeenCalledWith('Ahora se cobran los envases que faltan');
  });

  it('apaga con { enabled: false }', () => {
    const update = setup(true);
    fireEvent.click(toggle());
    expect((update.mutate.mock.calls[0] as unknown[])[0]).toEqual({ enabled: false });
    optionsOf(update).onSuccess({ enabled: false });
    expect(notify.success).toHaveBeenCalledWith('Volvió el canje 1 a 1');
  });

  it('encendido, avisa qué tipos activos no tienen precio de envase y enlaza al catálogo', () => {
    state.catalog = catalogOf(
      cylinder('a', '10kg', null),
      cylinder('b', '15kg', 4500),
      cylinder('c', '45kg', null, false),
      cylinder('d', '30kg', 0),
    );
    setup(true);
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent(/no se van a poder tomar/);
    expect(screen.getByText('10kg')).toBeInTheDocument();
    expect(screen.queryByText('15kg')).not.toBeInTheDocument();
    expect(screen.queryByText('45kg')).not.toBeInTheDocument();
    expect(screen.queryByText('30kg')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cargar los precios en el catálogo' })).toHaveAttribute(
      'href',
      '/cylinders',
    );
  });

  it('apagado no avisa aunque falten precios', () => {
    state.catalog = catalogOf(cylinder('a', '10kg', null));
    setup(false);
    expect(screen.queryByText(/no se van a poder tomar/)).not.toBeInTheDocument();
  });

  it('encendido y con todos los precios cargados, no avisa', () => {
    state.catalog = catalogOf(cylinder('b', '15kg', 4500));
    setup(true);
    expect(screen.queryByText(/no se van a poder tomar/)).not.toBeInTheDocument();
  });

  it('muestra el error del back y deja reintentar', () => {
    const update = setup(false);
    fireEvent.click(toggle());
    act(() => {
      optionsOf(update).onError(new ApiError(403, ['No tenés permiso para cambiar el cobro de envases']));
      optionsOf(update).onSettled();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('No tenés permiso para cambiar el cobro de envases');
    fireEvent.click(toggle());
    expect(update.mutate).toHaveBeenCalledTimes(2);
  });

  it('un doble clic hace una sola llamada', () => {
    const update = setup(false);
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    expect(update.mutate).toHaveBeenCalledTimes(1);
  });

  it('mientras guarda, el interruptor queda deshabilitado y se ve el estado de carga', () => {
    setup(false, { isPending: true });
    expect(toggle()).toBeDisabled();
    expect(screen.getByText('Guardando…')).toBeInTheDocument();
  });

  it('sin permiso de escritura no deja cambiar', () => {
    state.perms = { needsDistributor: false, canWrite: false, writeHint: 'Sólo lectura' };
    setup(false);
    expect(toggle()).toBeDisabled();
  });

  it('sin distribuidora elegida no consulta ni muestra el interruptor', () => {
    state.perms = { needsDistributor: true, canWrite: false, writeHint: 'Elegí' };
    state.query = ok(undefined);
    state.update = mutation();
    render(<ContainerChargeCard />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(queryOptions).toHaveBeenCalledWith({ enabled: false });
  });

  it('si la lectura falla muestra el error, no un interruptor apagado', () => {
    state.query = failed();
    state.update = mutation();
    render(<ContainerChargeCard />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
  });
});
