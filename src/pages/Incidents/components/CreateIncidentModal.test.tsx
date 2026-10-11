import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ createIncident: vi.fn(), uploadPhoto: vi.fn() }));
vi.mock('../../../services/api/incidents', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createIncident: api.createIncident,
}));
vi.mock('../../../services/api/photos', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  uploadPhoto: api.uploadPhoto,
}));
const notify = vi.hoisted(() => ({ error: vi.fn<[Error], void>(), success: vi.fn<[string], void>() }));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify,
}));
vi.mock('./OrderPicker', () => ({
  OrderPicker: ({ onSelect }: { onSelect: (order: unknown) => void }) => (
    <button type="button" onClick={() => onSelect({ order_id: 'o-1', customer: { user_id: 'u-1' } })}>
      Elegir pedido
    </button>
  ),
}));

import { ApiError } from '../../../services/api/errors';
import { CreateIncidentModal } from './CreateIncidentModal';

// jsdom no trae object URLs: la vista previa del PhotoPicker usa estos.
URL.createObjectURL = vi.fn(() => 'blob:preview');
URL.revokeObjectURL = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const png = new File([new Uint8Array(10)], 'f.png', { type: 'image/png' });

const renderModal = () => {
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <CreateIncidentModal open onClose={onClose} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByText('Elegir pedido'));
  fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'No estaba' } });
  return { onClose };
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Registrar incidencia' }));

describe('CreateIncidentModal', () => {
  it('crea la incidencia sin URL y sube la foto elegida a la incidencia nueva', async () => {
    api.createIncident.mockResolvedValue({ incident_id: 'i-1' });
    api.uploadPhoto.mockResolvedValue(undefined);
    const { onClose } = renderModal();
    expect(screen.queryByLabelText(/URL/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Elegir la foto'), { target: { files: [png] } });
    submit();
    await waitFor(() => expect(api.uploadPhoto).toHaveBeenCalledWith('incident', 'i-1', png));
    expect(api.createIncident).toHaveBeenCalledTimes(1);
    expect(api.createIncident.mock.calls[0]).toEqual([{ orderId: 'o-1', type: 'other', description: 'No estaba' }]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('si la foto falla muestra el motivo real y el alta no se repite', async () => {
    api.createIncident.mockResolvedValue({ incident_id: 'i-1' });
    api.uploadPhoto.mockRejectedValue(new ApiError(415, ['El archivo no es una imagen válida']));
    const { onClose } = renderModal();
    fireEvent.change(screen.getByLabelText('Elegir la foto'), { target: { files: [png] } });
    submit();
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(notify.error.mock.calls[0][0].message).toContain('La incidencia se registró, pero la foto no se pudo subir');
    expect(notify.error.mock.calls[0][0].message).toContain('El archivo no es una imagen válida');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.createIncident).toHaveBeenCalledTimes(1);
  });

  it('un doble envío mientras se guarda no crea dos incidencias', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.createIncident.mockReturnValue(new Promise((r) => (resolve = r)));
    renderModal();
    submit();
    submit();
    fireEvent.submit(document.getElementById('incident-create') as HTMLFormElement);
    await waitFor(() => expect(api.createIncident).toHaveBeenCalledTimes(1));
    resolve({ incident_id: 'i-1' });
  });
});
