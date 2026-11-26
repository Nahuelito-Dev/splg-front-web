import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FailedVisit, Order } from '../../../../services/api/types';

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('../../../../services/queries/failedVisits', () => ({
  useOrderFailedVisits: () => state.value,
  useRevisitOptions: () => ({ data: [], isLoading: false, isError: false }),
  useScheduleRevisit: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canOperate: true, operateHint: undefined }),
}));

import { OrderFailedVisits } from './OrderFailedVisits';

const VISIT = {
  failedVisitId: 'v1',
  reason: 'customer_absent',
  note: null,
  failedAt: '2026-11-21T13:00:00Z',
  latitude: null,
  longitude: null,
  accuracyMeters: null,
  distanceMeters: null,
  outOfRange: false,
  reportedByRole: 'admin',
  reportedByName: null,
  outcome: 'proposed',
  agreedWithCustomer: false,
  proposedDate: '2026-11-26',
  proposedTimeSlotName: 'Mañana',
  resolution: null,
  finalDate: null,
  finalTimeSlotName: null,
} as unknown as FailedVisit;

const order = (over: Partial<Order> = {}): Order =>
  ({
    order_id: '00000000-0000-4000-8000-000000abc123',
    status: 'pending',
    delivery_id: null,
    revisit: {
      status: 'proposed',
      failedVisitCount: 1,
      scheduledDate: '2026-11-26',
      timeSlotId: 'm',
      timeSlotName: 'Mañana',
      windowStart: '09:00:00',
      windowEnd: '13:00:00',
      canRespond: true,
    },
    ...over,
  }) as unknown as Order;

afterEach(cleanup);

describe('OrderFailedVisits', () => {
  it('un pedido sin visitas fallidas no dibuja nada', () => {
    state.value = { data: [], isError: false };
    const { container } = render(<OrderFailedVisits order={order()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('si falla la carga lo dice en vez de ocultar la tarjeta', () => {
    state.value = { data: undefined, isError: true, error: new Error('boom'), refetch: vi.fn() };
    render(<OrderFailedVisits order={order()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las visitas fallidas del pedido');
  });

  it('muestra la nueva visita, el historial y deja fijar día y franja con el pedido pendiente sin chofer', () => {
    state.value = { data: [VISIT], isError: false };
    render(<OrderFailedVisits order={order()} />);
    expect(screen.getByText('Propuesta al cliente')).toBeInTheDocument();
    expect(screen.getByText(/Mañana \(09:00 a 13:00\)/)).toBeInTheDocument();
    expect(screen.getByText('El cliente no estaba')).toBeInTheDocument();
    expect(screen.getByText('Se informó sin ubicación.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fijar día y franja' }));
    expect(screen.getByRole('dialog', { name: 'Fijar la nueva visita' })).toBeInTheDocument();
  });

  it('con chofer asignado, o ya cerrado, queda el historial pero no se fija la visita', () => {
    state.value = { data: [VISIT], isError: false };
    render(<OrderFailedVisits order={order({ status: 'accepted', delivery_id: 'd-1' })} />);
    expect(screen.queryByRole('button', { name: 'Fijar día y franja' })).not.toBeInTheDocument();
    cleanup();
    render(<OrderFailedVisits order={order({ status: 'delivered', revisit: null })} />);
    expect(screen.getByText('El cliente no estaba')).toBeInTheDocument();
    expect(screen.queryByText('Nueva visita:')).not.toBeInTheDocument();
  });

  it('con la decisión en el admin dice qué hacer en lugar de una fecha', () => {
    state.value = { data: [VISIT], isError: false };
    render(
      <OrderFailedVisits
        order={order({
          revisit: {
            status: 'awaiting_admin',
            failedVisitCount: 2,
            scheduledDate: null,
            timeSlotId: null,
            timeSlotName: null,
            windowStart: null,
            windowEnd: null,
            canRespond: false,
          },
        })}
      />,
    );
    expect(screen.getByText('Decidís vos')).toBeInTheDocument();
    expect(screen.getByText(/Sin fecha: fijala, reasigná el pedido o cancelalo/)).toBeInTheDocument();
  });
});
