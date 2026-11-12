import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const perms = vi.hoisted(() => ({ needsDistributor: false }));
const listFleetPlans = vi.hoisted(() => vi.fn(() => Promise.resolve([])));
vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: perms.needsDistributor }),
}));
vi.mock('../../../services/api/fleet', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listFleetPlans,
}));

import { FleetTaskFormModal } from './FleetTaskFormModal';

afterEach(() => {
  cleanup();
  listFleetPlans.mockClear();
  perms.needsDistributor = false;
});

const renderModal = (open: boolean) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FleetTaskFormModal open={open} onClose={vi.fn()} subject="driver" ownerId="d-1" task={null} />
    </QueryClientProvider>,
  );

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('FleetTaskFormModal: planes sin distribuidora', () => {
  it('sin «Ver como» no pide los planes ni con el modal abierto (la API exige X-Distributor)', async () => {
    perms.needsDistributor = true;
    renderModal(true);
    await settle();
    expect(listFleetPlans).not.toHaveBeenCalled();
  });

  it('cerrado no los pide: el modal queda montado en Tareas de flota', async () => {
    renderModal(false);
    await settle();
    expect(listFleetPlans).not.toHaveBeenCalled();
  });

  it('abierto y con distribuidora elegida pide los planes activos del sujeto', async () => {
    renderModal(true);
    await waitFor(() => expect(listFleetPlans).toHaveBeenCalledWith({ subject: 'driver', isActive: true }));
  });
});
