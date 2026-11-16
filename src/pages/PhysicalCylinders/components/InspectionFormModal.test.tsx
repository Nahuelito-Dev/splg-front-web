import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectionFormModal } from './InspectionFormModal';
import { todayDay } from '../inspection';

const mutate = vi.hoisted(() => vi.fn<[{ id: string; body: object }], void>());
vi.mock('../../../services/queries/physicalCylinders', () => ({
  useRegisterInspection: () => ({ mutate, isPending: false }),
}));
vi.mock('../../../utils/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  confirm: vi.fn(),
  subscribeConfirmOpen: () => () => undefined,
  isConfirmOpen: () => false,
}));

const open = () => render(<InspectionFormModal open onClose={vi.fn()} cylinderId="c-1" />);

describe('InspectionFormModal', () => {
  beforeEach(() => {
    mutate.mockReset();
  });
  afterEach(cleanup);

  it('sin vencimiento no envía y lo pide', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar revisión' }));
    expect(await screen.findByText('Elegí hasta cuándo puede circular')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('envía la revisión aprobada con sus fechas', async () => {
    open();
    fireEvent.change(screen.getByLabelText(/Fecha de la revisión/), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText(/Puede circular hasta/), { target: { value: '2031-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar revisión' }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0]?.[0]).toEqual({
      id: 'c-1',
      body: { inspectedAt: '2026-10-01', result: 'approved', nextDueAt: '2031-10-01' },
    });
  });

  it('un rechazo no pide vencimiento y avisa que el envase queda vencido', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'rejected' } });
    expect(screen.queryByLabelText(/Puede circular hasta/)).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent(/queda en la fecha de la revisión/);
    fireEvent.change(screen.getByLabelText(/Fecha de la revisión/), { target: { value: todayDay() } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar revisión' }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0]?.[0].body).not.toHaveProperty('nextDueAt');
  });
});
