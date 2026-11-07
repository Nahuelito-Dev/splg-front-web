import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok, renderPage } from '../../../../test/pageTest';

const containers = vi.hoisted(() => vi.fn());
const movements = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/queries/customerContainers', () => ({
  useCustomerContainers: (...args: unknown[]) => containers(...args) as unknown,
  useCustomerContainerMovements: (...args: unknown[]) => movements(...args) as unknown,
  useAdjustCustomerContainers: () => mutation(),
}));
const perms = vi.hoisted(() => ({ operateHint: undefined as string | undefined }));
vi.mock('../../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ operateHint: perms.operateHint }),
}));

import { CustomerContainersCard } from './CustomerContainersCard';

const account = (over: Record<string, unknown>) => ({
  gasCylinderId: 'g-10',
  type: '10kg',
  owned: 2,
  loanedByM5: 0,
  isActive: true,
  ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  perms.operateHint = undefined;
});

const draw = () => renderPage(<CustomerContainersCard customerId="c-1" />);
const rowOf = (type: string) => screen.getByText(type).closest('li') as HTMLElement;

describe('CustomerContainersCard', () => {
  it('pide los envases con el id de la ficha y muestra los propios por tipo', () => {
    containers.mockReturnValue(
      ok({ items: [account({}), account({ gasCylinderId: 'g-15', type: '15kg', owned: 0 })] }),
    );
    movements.mockReturnValue(loading());
    draw();
    expect(containers).toHaveBeenCalledWith('c-1');
    expect(within(rowOf('10kg')).getByText('Propios').nextSibling).toHaveTextContent('2');
    expect(within(rowOf('15kg')).getByText('Propios').nextSibling).toHaveTextContent('0');
  });

  it('los prestados por el recupero se muestran aparte y sólo si hay', () => {
    containers.mockReturnValue(
      ok({ items: [account({ loanedByM5: 3 }), account({ gasCylinderId: 'g-15', type: '15kg', loanedByM5: 0 })] }),
    );
    movements.mockReturnValue(loading());
    draw();
    expect(within(rowOf('10kg')).getByText('Prestados (recupero)').nextSibling).toHaveTextContent('3');
    expect(within(rowOf('15kg')).queryByText('Prestados (recupero)')).not.toBeInTheDocument();
  });

  it('un tipo dado de baja lleva su marca; uno activo no', () => {
    containers.mockReturnValue(
      ok({ items: [account({}), account({ gasCylinderId: 'g-45', type: '45kg', owned: 1, isActive: false })] }),
    );
    movements.mockReturnValue(loading());
    draw();
    expect(within(rowOf('45kg')).getByText('Dado de baja')).toBeInTheDocument();
    expect(within(rowOf('10kg')).queryByText('Dado de baja')).not.toBeInTheDocument();
  });

  it('mientras carga no muestra el vacío', () => {
    containers.mockReturnValue(loading());
    draw();
    expect(screen.getByRole('status', { name: 'Cargando listado' })).toBeInTheDocument();
    expect(screen.queryByText('Sin tipos de garrafa')).not.toBeInTheDocument();
  });

  it('sin tipos lo dice y no deja ajustar', () => {
    containers.mockReturnValue(ok({ items: [] }));
    draw();
    expect(screen.getByText('Sin tipos de garrafa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajustar' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('un error se dice y permite reintentar', () => {
    const refetch = vi.fn();
    containers.mockReturnValue(failed(refetch));
    draw();
    expect(screen.queryByText('Sin tipos de garrafa')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('«Ajustar» abre el modal de ajuste', () => {
    containers.mockReturnValue(ok({ items: [account({})] }));
    movements.mockReturnValue(loading());
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar' }));
    expect(screen.getByRole('dialog', { name: 'Ajustar envases' })).toBeInTheDocument();
  });

  it('«Ver historial» abre el historial', () => {
    containers.mockReturnValue(ok({ items: [account({})] }));
    movements.mockReturnValue(ok({ items: [], total: 0, limit: 10, offset: 0 }));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(screen.getByRole('dialog', { name: 'Historial de envases' })).toBeInTheDocument();
  });

  it('sin distribuidora elegida no deja ajustar', () => {
    perms.operateHint = 'Elegí una distribuidora en «Ver como» para operar';
    containers.mockReturnValue(ok({ items: [account({})] }));
    draw();
    expect(screen.getByRole('button', { name: 'Ajustar' })).toHaveAttribute('aria-disabled', 'true');
  });
});
