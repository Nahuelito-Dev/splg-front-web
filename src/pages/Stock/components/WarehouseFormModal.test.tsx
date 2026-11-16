import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WarehouseV2 } from '../../../services/api/types';
import { mapHandlers, markerHandlers } from '../../../test/googleMapsHandlers';

const mocks = vi.hoisted(() => ({
  create: vi.fn<[unknown, unknown?], void>(),
  update: vi.fn<[unknown, unknown?], void>(),
}));
vi.mock('../../../services/queries/stock', () => ({
  useCreateWarehouse: () => ({ mutate: mocks.create, isPending: false }),
  useUpdateWarehouse: () => ({ mutate: mocks.update, isPending: false }),
}));
import { WarehouseFormModal } from './WarehouseFormModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const GALPON: WarehouseV2 = {
  warehouseId: 'w-1',
  locationId: 'l-1',
  name: 'Central',
  code: 'CEN',
  kind: 'depot',
  address: null,
  isDefault: true,
  isActive: true,
  createdAt: '2026-11-01T12:00:00Z',
  updatedAt: '2026-11-01T12:00:00Z',
  latitude: -27.3671,
  longitude: -55.8961,
};

/** El pin del mapa (Google Maps simulado): sus coordenadas, o «sin pin». */
const pin = () => {
  const marker = screen.queryByTestId('map-marker');
  return marker ? `${marker.dataset.lat},${marker.dataset.lng}` : 'sin pin';
};
const PIN = 'Ubicación elegida (arrastrala para ajustarla)';

const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('WarehouseFormModal: ubicación del galpón', () => {
  it('el clic en el mapa completa las coordenadas y el alta las manda como número', async () => {
    render(<WarehouseFormModal open onClose={vi.fn()} warehouse={null} />);
    expect(pin()).toBe('sin pin');
    type(/^Nombre/, 'Norte');
    type(/^Código/, 'NOR');
    act(() => mapHandlers.click({ lat: -27.3671234, lng: -55.8961 }));
    expect(screen.getByLabelText(/^Latitud/)).toHaveValue('-27.367123');
    expect(screen.getByLabelText(/^Longitud/)).toHaveValue('-55.896100');
    fireEvent.click(screen.getByRole('button', { name: 'Crear galpón' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ name: 'Norte', latitude: -27.367123, longitude: -55.8961 });
  });

  it('arrastrar el pin completa las coordenadas y la edición las manda', async () => {
    render(<WarehouseFormModal open onClose={vi.fn()} warehouse={GALPON} />);
    await waitFor(() => expect(screen.getByLabelText(/^Latitud/)).toHaveValue('-27.367100'));
    act(() => markerHandlers.drag(PIN, { lat: -27.3812345, lng: -55.9012345 }));
    expect(screen.getByLabelText(/^Latitud/)).toHaveValue('-27.381235');
    expect(screen.getByLabelText(/^Longitud/)).toHaveValue('-55.901235');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      id: 'w-1',
      body: { latitude: -27.381235, longitude: -55.901235 },
    });
  });

  it('escribir las coordenadas mueve el pin del mapa', () => {
    render(<WarehouseFormModal open onClose={vi.fn()} warehouse={null} />);
    type(/^Latitud/, '-27.5');
    type(/^Longitud/, '-55.7');
    expect(pin()).toBe('-27.5,-55.7');
  });

  it('una sola coordenada no se envía y dice que van las dos', async () => {
    render(<WarehouseFormModal open onClose={vi.fn()} warehouse={null} />);
    type(/^Nombre/, 'Norte');
    type(/^Código/, 'NOR');
    type(/^Latitud/, '-27.5');
    fireEvent.click(screen.getByRole('button', { name: 'Crear galpón' }));
    expect(await screen.findByText('Va junto con la latitud: completá las dos o ninguna')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('una latitud fuera de rango no se envía ni se dibuja', async () => {
    render(<WarehouseFormModal open onClose={vi.fn()} warehouse={null} />);
    type(/^Nombre/, 'Norte');
    type(/^Código/, 'NOR');
    type(/^Latitud/, '95');
    type(/^Longitud/, '-55');
    expect(pin()).toBe('sin pin');
    fireEvent.click(screen.getByRole('button', { name: 'Crear galpón' }));
    expect(await screen.findByText('La latitud va de -90 a 90')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('la edición precarga el punto y «Quitar ubicación» manda las dos en null', async () => {
    render(<WarehouseFormModal open onClose={vi.fn()} warehouse={GALPON} />);
    await waitFor(() => expect(screen.getByLabelText(/^Latitud/)).toHaveValue('-27.367100'));
    expect(pin()).toBe('-27.3671,-55.8961');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar ubicación' }));
    expect(screen.getByLabelText(/^Latitud/)).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(mocks.update.mock.calls[0][0]).toMatchObject({ id: 'w-1', body: { latitude: null, longitude: null } });
  });

  it('la edición sin tocar la ubicación no la manda', async () => {
    render(<WarehouseFormModal open onClose={vi.fn()} warehouse={GALPON} />);
    await waitFor(() => expect(screen.getByLabelText(/^Latitud/)).toHaveValue('-27.367100'));
    type(/^Nombre/, 'Central Posadas');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    const { body } = mocks.update.mock.calls[0][0] as { body: Record<string, unknown> };
    expect(body).toMatchObject({ name: 'Central Posadas' });
    expect(body).not.toHaveProperty('latitude');
    expect(body).not.toHaveProperty('longitude');
  });
});
