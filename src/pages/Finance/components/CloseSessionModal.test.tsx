import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../../../services/api/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  preview: vi.fn<
    [string, unknown, boolean],
    {
      data?: { difference: number; totalIn?: number; totalOut?: number; expectedAmount?: number };
      isError: boolean;
      error?: unknown;
    }
  >(),
}));
vi.mock('../../../services/queries/finance', () => ({
  useCashSession: () => ({
    data: { openingAmount: 5000, totalIn: 14000, totalOut: 750, currentBalance: 18250 },
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCloseCashSession: () => ({ mutate: vi.fn(), isPending: false }),
  useCloseCashSessionPreview: (id: string, body: unknown, enabled: boolean) => mocks.preview(id, body, enabled),
}));
vi.mock('../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { CloseSessionModal } from './CloseSessionModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderModal = () =>
  render(
    <MemoryRouter>
      <CloseSessionModal open onClose={vi.fn()} sessionId="s1" />
    </MemoryRouter>,
  );

const typeCounted = (value: string) => fireEvent.change(screen.getByLabelText(/Monto contado/), { target: { value } });

describe('CloseSessionModal: la diferencia del cierre la calcula el back', () => {
  it('muestra la diferencia que devuelve el back, no una cuenta del panel', async () => {
    // El panel restaría 18000 − 18250 = −250; el back dice otra cosa y es lo que se ve.
    mocks.preview.mockImplementation((_id, body) =>
      body ? { data: { difference: -777 }, isError: false } : { isError: false },
    );
    renderModal();
    typeCounted('18000');
    expect(screen.queryByText(/Faltan/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Faltan'), { timeout: 2000 });
    expect(screen.getByRole('status')).toHaveTextContent('777');
    expect(mocks.preview).toHaveBeenLastCalledWith('s1', { countedAmount: 18000 }, true);
  });

  it('un importe ilegible no consulta ni inventa una diferencia', async () => {
    mocks.preview.mockReturnValue({ data: { difference: 5 }, isError: false });
    renderModal();
    typeCounted('12abc');
    await new Promise((r) => setTimeout(r, 600));
    expect(mocks.preview).toHaveBeenLastCalledWith('s1', null, true);
    expect(screen.queryByText(/Faltan|Sobran|Coincide/)).not.toBeInTheDocument();
  });

  it('si el back no contesta lo avisa y no inventa una diferencia', async () => {
    mocks.preview.mockReturnValue({ isError: true });
    renderModal();
    typeCounted('18000');
    expect(
      await screen.findByText(/No se pudo calcular la diferencia/, undefined, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Faltan|Sobran|Coincide/)).not.toBeInTheDocument();
  });

  it('con la vista previa a la vista, Entradas, Salidas y esperado son los del back', async () => {
    mocks.preview.mockImplementation((_id, body) =>
      body
        ? { data: { difference: 5, totalIn: 91111, totalOut: 222, expectedAmount: 93333 }, isError: false }
        : { isError: false },
    );
    renderModal();
    expect(screen.getByText(/14\.000/)).toBeInTheDocument();
    typeCounted('18000');
    await waitFor(() => expect(screen.getByText(/91\.111/)).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText(/93\.333/)).toBeInTheDocument();
    expect(screen.queryByText(/14\.000/)).not.toBeInTheDocument();
  });

  it('409: dice que la sesión ya está cerrada, sin «podés cerrar igual»', async () => {
    mocks.preview.mockReturnValue({ isError: true, error: new ApiError(409, ['La sesión ya está cerrada']) });
    renderModal();
    typeCounted('18000');
    expect(await screen.findByText('La sesión ya está cerrada.', undefined, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.queryByText(/Podés cerrar igual/)).not.toBeInTheDocument();
  });

  it('400 por el importe: muestra el mensaje del back', async () => {
    mocks.preview.mockReturnValue({ isError: true, error: new ApiError(400, ['no puede ser negativo']) });
    renderModal();
    typeCounted('18000');
    expect(await screen.findByText('no puede ser negativo', undefined, { timeout: 2000 })).toBeInTheDocument();
  });
});
