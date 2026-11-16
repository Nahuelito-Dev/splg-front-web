import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  slots: [{ time_slot_id: 's1', name: 'Mañana', startTime: '08:00:00', endTime: '12:00:00' }],
}));
vi.mock('../../../services/queries/timeSlots', () => ({
  useTimeSlots: () => ({ data: mocks.slots, refetch: () => Promise.resolve({ data: mocks.slots }) }),
  useCreateTimeSlot: () => ({ mutate: mocks.create, isPending: false }),
  useUpdateTimeSlot: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { TimeSlotFormModal } from './TimeSlotFormModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const fill = (name: string, from: string, to: string) => {
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Inicio/), { target: { value: from } });
  fireEvent.change(screen.getByLabelText(/Fin/), { target: { value: to } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear franja' }));
};

describe('TimeSlotFormModal: choques con las franjas activas', () => {
  it('un horario que pisa a otra franja no se envía y muestra el texto del back', async () => {
    render(<TimeSlotFormModal open onClose={vi.fn()} />);
    fill('Prueba', '10:00', '14:00');
    expect(
      await screen.findByText(
        'La franja se solapa con «Mañana» (08:00 a 12:00): ajustá el horario o desactivá esa franja',
      ),
    ).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('el nombre repetido no se envía', async () => {
    render(<TimeSlotFormModal open onClose={vi.fn()} />);
    fill('mañana', '13:00', '14:00');
    expect(await screen.findByText('Ya existe una franja activa con el nombre «Mañana»')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('sin choque se envía', async () => {
    render(<TimeSlotFormModal open onClose={vi.fn()} />);
    fill('Tarde', '13:00', '14:00');
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
  });
});
