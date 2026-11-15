import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserAddressConUsuario } from '../../../../services/api/types';
import { mapHandlers, markerHandlers } from '../../../../test/googleMapsHandlers';

const mocks = vi.hoisted(() => ({
  create: vi.fn<[Record<string, unknown>, unknown?], void>(),
  update: vi.fn<[{ addressId: string; body: Record<string, unknown> }, unknown?], void>(),
  fresh: undefined as unknown,
}));
vi.mock('../../../../services/queries/userAddresses', () => ({
  useCreateUserAddress: () => ({ mutate: mocks.create, isPending: false }),
  useUpdateUserAddress: () => ({ mutate: mocks.update, isPending: false }),
  useUserAddress: () => ({ data: mocks.fresh, isPending: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { AddressFormModal } from './AddressFormModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const PIN = 'Ubicación elegida (arrastrala para ajustarla)';
const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

const ADDRESS = {
  address_id: 'a-1',
  user_id: 'u-1',
  street: 'Mitre 123',
  city: 'Posadas',
  postalCode: null,
  latitude: '-27.367',
  longitude: '-55.896',
  floor: null,
  apartment: null,
  placeId: null,
  geocodePrecision: 'approximate',
  formattedAddress: null,
  isDefault: true,
  additionalInstructions: null,
  createdAt: '2026-11-01T12:00:00Z',
  updatedAt: '2026-11-01T12:00:00Z',
} as UserAddressConUsuario;

describe('AddressFormModal: el punto en el mapa', () => {
  it('el alta manda el punto del clic, corregido arrastrando el pin', async () => {
    render(<AddressFormModal open onClose={vi.fn()} userId="u-1" address={null} isFirstAddress />);
    type(/^Calle y número/, 'Mitre 123');
    type(/^Ciudad/, 'Posadas');
    act(() => mapHandlers.click({ lat: -27.4, lng: -55.9 }));
    act(() => markerHandlers.drag(PIN, { lat: -27.401, lng: -55.902 }));
    expect(screen.getByText('-27.401000, -55.902000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar dirección' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ latitude: '-27.401', longitude: '-55.902', user_id: 'u-1' });
  });

  it('al editar, arrastrar el pin habilita guardar y manda la ubicación nueva', async () => {
    mocks.fresh = ADDRESS;
    render(<AddressFormModal open onClose={vi.fn()} userId="u-1" address={ADDRESS} isFirstAddress={false} />);
    await waitFor(() => expect(screen.getByText('-27.367000, -55.896000')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    act(() => markerHandlers.drag(PIN, { lat: -27.38, lng: -55.91 }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      addressId: 'a-1',
      body: { latitude: '-27.38', longitude: '-55.91' },
    });
  });
});
