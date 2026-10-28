import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const permissions = vi.fn();
const drivers = vi.fn();
vi.mock('../../../hooks', () => ({
  usePermissions: () => permissions() as unknown,
  useDebounce: <T,>(value: T) => value,
}));
vi.mock('../../../services/queries/orders', () => ({
  useEnabledDeliveries: (search: string, scope: { distributorId?: string; enabled?: boolean }) =>
    drivers(search, scope) as unknown,
}));

import { AssignDriverModal } from './AssignDriverModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderModal = (distributorId?: string, error?: unknown) =>
  render(
    <AssignDriverModal
      open
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      assigning={false}
      distributorId={distributorId}
      error={error}
    />,
  );

const driver = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  delivery_id: id,
  isEnabled: true,
  validated: true,
  isAvailable: false,
  user: { full_name: name, phone_number: '1' },
  ...over,
});

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

  it('lista también a los desconectados, con su estado y los en línea primero', () => {
    permissions.mockReturnValue({ needsDistributor: false });
    drivers.mockReturnValue({
      data: {
        rows: [
          driver('a', 'Ana Off'),
          driver('b', 'Beto On', { isAvailable: true }),
          driver('c', 'Carla Off'),
          driver('d', 'Dario Sin validar', { validated: false }),
        ],
        total: 4,
      },
      isPending: false,
    });
    renderModal();
    const names = screen.getAllByText(/Off|On$/).map((node) => node.textContent);
    expect(names).toEqual(['Beto On', 'Ana Off', 'Carla Off']);
    expect(screen.getByText('En línea')).toBeInTheDocument();
    expect(screen.getAllByText('Desconectado')).toHaveLength(2);
    expect(screen.queryByText('Dario Sin validar')).not.toBeInTheDocument();
  });

  it('sin choferes habilitados y validados muestra el mensaje vacío', () => {
    permissions.mockReturnValue({ needsDistributor: false });
    drivers.mockReturnValue({
      data: { rows: [driver('d', 'Dario', { validated: false })], total: 1 },
      isPending: false,
    });
    renderModal();
    expect(screen.getByText('No hay choferes habilitados y validados')).toBeInTheDocument();
  });

  it('muestra el rechazo del back dentro del modal y lo oculta al elegir otro chofer', () => {
    permissions.mockReturnValue({ needsDistributor: false });
    drivers.mockReturnValue({ data: { rows: [driver('a', 'Ana Off')], total: 1 }, isPending: false });
    const failure = new Error('La documentación del chofer está vencida');
    const { rerender } = render(
      <AssignDriverModal open={false} onClose={vi.fn()} onConfirm={vi.fn()} assigning={false} error={failure} />,
    );
    rerender(<AssignDriverModal open onClose={vi.fn()} onConfirm={vi.fn()} assigning={false} error={failure} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const next = new Error('La documentación del chofer está vencida');
    rerender(<AssignDriverModal open onClose={vi.fn()} onConfirm={vi.fn()} assigning={false} error={next} />);
    expect(screen.getByRole('alert')).toHaveTextContent('La documentación del chofer está vencida');
    fireEvent.click(screen.getByRole('radio'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
