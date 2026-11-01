import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DriverSettlementDetail } from '../../../services/api/types';

const mocks = vi.hoisted(() => ({
  preview: vi.fn<
    [string, unknown, boolean],
    { data?: { difference: number; expectedCash: number }; isError: boolean }
  >(),
}));
vi.mock('../../../services/queries/finance', () => ({
  useCashCategories: () => ({ data: { data: [{ categoryId: 'c1', name: 'Combustible' }] } }),
  useSubmitDriverSettlement: () => ({ mutate: vi.fn(), isPending: false }),
  useDriverSettlementPreview: (id: string, body: unknown, enabled: boolean) => mocks.preview(id, body, enabled),
}));
vi.mock('../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { SubmitSettlementModal } from './SubmitSettlementModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const settlement = { settlementId: 's1', expectedCash: 50000 } as unknown as DriverSettlementDetail;

const renderModal = () =>
  render(
    <MemoryRouter>
      <SubmitSettlementModal open onClose={vi.fn()} settlement={settlement} />
    </MemoryRouter>,
  );

const typeCash = (value: string) =>
  fireEvent.change(screen.getByLabelText(/Efectivo que entrega/), { target: { value } });

describe('SubmitSettlementModal: la diferencia la calcula el back', () => {
  it('muestra la diferencia que devuelve el back, no una cuenta del panel', async () => {
    mocks.preview.mockImplementation((_id, body) =>
      body ? { data: { difference: -123, expectedCash: 51000 }, isError: false } : { isError: false },
    );
    renderModal();
    typeCash('46000');
    expect(screen.queryByText(/Faltan/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Faltan'), { timeout: 2000 });
    expect(screen.getByRole('status')).toHaveTextContent('123');
    expect(screen.getByText(/Se esperan/)).toHaveTextContent('51.000');
    expect(mocks.preview).toHaveBeenLastCalledWith('s1', { declaredCash: 46000 }, true);
  });

  it('manda a la consulta los gastos legibles y deja afuera los vacíos', async () => {
    mocks.preview.mockReturnValue({ isError: false });
    renderModal();
    typeCash('46000');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar gasto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar gasto' }));
    fireEvent.change(screen.getAllByLabelText(/Importe/)[0], { target: { value: '3500,50' } });
    await waitFor(
      () =>
        expect(mocks.preview).toHaveBeenLastCalledWith(
          's1',
          { declaredCash: 46000, expenses: [{ amount: 3500.5 }] },
          true,
        ),
      { timeout: 2000 },
    );
  });

  it('un importe de gasto ilegible no consulta y lo dice', async () => {
    mocks.preview.mockReturnValue({ isError: false });
    renderModal();
    typeCash('46000');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar gasto' }));
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '12abc' } });
    expect(await screen.findByText(/Revisá el importe del gasto/)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 600));
    expect(mocks.preview).toHaveBeenLastCalledWith('s1', null, true);
  });

  it('si el back no contesta lo avisa y no inventa una diferencia', async () => {
    mocks.preview.mockReturnValue({ isError: true });
    renderModal();
    typeCash('46000');
    expect(
      await screen.findByText(/No se pudo calcular la diferencia/, undefined, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Faltan|Sobran|Coincide/)).not.toBeInTheDocument();
  });
});
