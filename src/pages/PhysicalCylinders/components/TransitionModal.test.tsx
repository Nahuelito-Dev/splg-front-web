import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cylinder } from '../../../services/api/types';
import { TransitionModal } from './TransitionModal';

const mutate = vi.hoisted(() => vi.fn<[{ id: string; body: object }], void>());
vi.mock('../../../services/queries/physicalCylinders', () => ({
  useTransitionCylinder: () => ({ mutate, isPending: false }),
}));
vi.mock('../../../utils/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  confirm: vi.fn(),
  subscribeConfirmOpen: () => () => undefined,
  isConfirmOpen: () => false,
}));

const ORDER = '5cfab34c-0000-4000-8000-000000000001';
const cylinder = { cylinder_id: 'c-1', serial: 'S-1', state: 'dispatched' } as unknown as Cylinder;

const open = () => render(<TransitionModal open onClose={vi.fn()} cylinder={cylinder} />);

describe('TransitionModal', () => {
  beforeEach(() => {
    mutate.mockReset();
  });
  afterEach(cleanup);

  it('«con el cliente» sin pedido no envía y lo pide', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'with_customer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText(/Indicá el pedido/)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('«con el cliente» con pedido envía el pedido', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'with_customer' } });
    fireEvent.change(screen.getByLabelText(/Pedido asociado/), { target: { value: ORDER } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0]?.[0]).toEqual({ id: 'c-1', body: { toState: 'with_customer', orderId: ORDER } });
  });
});
