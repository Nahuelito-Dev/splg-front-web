import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ createClaim: vi.fn(), uploadPhoto: vi.fn() }));
vi.mock('../../../services/api/claims', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createClaim: api.createClaim,
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
import { CreateClaimModal } from './CreateClaimModal';

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
      <CreateClaimModal open onClose={onClose} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByText('Elegir pedido'));
  fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Fuga' } });
  fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'No estaba' } });
  return { onClose };
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Cargar reclamo' }));

describe('CreateClaimModal', () => {
  it('crea la reclamo sin URL y sube la foto elegida a el reclamo nuevo', async () => {
    api.createClaim.mockResolvedValue({ claim_id: 'c-1' });
    api.uploadPhoto.mockResolvedValue(undefined);
    const { onClose } = renderModal();
    expect(screen.queryByLabelText(/URL/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Elegir la foto'), { target: { files: [png] } });
    submit();
    await waitFor(() => expect(api.uploadPhoto).toHaveBeenCalledWith('claim', 'c-1', png));
    expect(api.createClaim).toHaveBeenCalledTimes(1);
    expect(api.createClaim.mock.calls[0]).toEqual([
      { orderId: 'o-1', customerId: 'u-1', reason: 'Fuga', description: 'No estaba' },
    ]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('si la foto falla muestra el motivo real y el alta no se repite', async () => {
    api.createClaim.mockResolvedValue({ claim_id: 'c-1' });
    api.uploadPhoto.mockRejectedValue(new ApiError(415, ['El archivo no es una imagen válida']));
    const { onClose } = renderModal();
    fireEvent.change(screen.getByLabelText('Elegir la foto'), { target: { files: [png] } });
    submit();
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(notify.error.mock.calls[0][0].message).toContain('El reclamo se registró, pero la foto no se pudo subir');
    expect(notify.error.mock.calls[0][0].message).toContain('El archivo no es una imagen válida');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.createClaim).toHaveBeenCalledTimes(1);
  });

  it('un doble envío mientras se guarda no crea dos reclamos', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.createClaim.mockReturnValue(new Promise((r) => (resolve = r)));
    renderModal();
    submit();
    submit();
    fireEvent.submit(document.getElementById('claim-create') as HTMLFormElement);
    await waitFor(() => expect(api.createClaim).toHaveBeenCalledTimes(1));
    resolve({ claim_id: 'c-1' });
  });
});
