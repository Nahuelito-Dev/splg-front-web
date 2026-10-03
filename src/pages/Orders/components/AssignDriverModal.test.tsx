import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const permissions = vi.fn();
const drivers = vi.fn();
vi.mock('../../../hooks', () => ({
  usePermissions: () => permissions() as unknown,
  useDebounce: <T,>(value: T) => value,
}));
vi.mock('../../../services/queries/orders', () => ({
  useActiveDeliveries: (search: string, scope: { distributorId?: string; enabled?: boolean }) =>
    drivers(search, scope) as unknown,
}));

import { AssignDriverModal } from './AssignDriverModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderModal = (distributorId?: string) =>
  render(
    <AssignDriverModal open onClose={vi.fn()} onConfirm={vi.fn()} assigning={false} distributorId={distributorId} />,
  );

describe('AssignDriverModal', () => {
  it('el administrador general sin empresa conocida no lista choferes de todas: pide «Ver como»', () => {
    permissions.mockReturnValue({ needsDistributor: true });
    drivers.mockReturnValue({ data: undefined, isPending: false });
    renderModal();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(drivers).toHaveBeenLastCalledWith('', { distributorId: undefined, enabled: false });
  });

  it('con la empresa del pedido, el administrador general lista los choferes de esa empresa', () => {
    permissions.mockReturnValue({ needsDistributor: true });
    drivers.mockReturnValue({ data: { rows: [], total: 0 }, isPending: false });
    renderModal('dist-1');
    expect(drivers).toHaveBeenLastCalledWith('', { distributorId: 'dist-1', enabled: true });
    expect(screen.queryByText('Elegí una distribuidora')).not.toBeInTheDocument();
  });

  it('un administrador de empresa no manda empresa: la API la toma del token', () => {
    permissions.mockReturnValue({ needsDistributor: false });
    drivers.mockReturnValue({ data: { rows: [], total: 0 }, isPending: false });
    renderModal('dist-1');
    expect(drivers).toHaveBeenLastCalledWith('', { distributorId: undefined, enabled: true });
  });
});
