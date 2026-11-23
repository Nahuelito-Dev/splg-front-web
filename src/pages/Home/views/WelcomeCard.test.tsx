import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WelcomeCard } from './WelcomeCard';

const state = vi.hoisted(() => ({ granted: [] as string[] }));
vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAppSelector: () => 'Ana Admin',
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
  usePermiso: (code: string) => ({ allowed: state.granted.includes(code), known: true }),
}));
vi.mock('../../../services/queries/stats', () => ({ useOrderStats: () => ({ data: undefined }) }));

afterEach(cleanup);

const renderCard = () =>
  render(
    <MemoryRouter>
      <WelcomeCard />
    </MemoryRouter>,
  );

describe('WelcomeCard: atajo al seguimiento en vivo', () => {
  it('con `pedidos.ver` o `despacho.gestionar` ofrece «Pedidos sin chofer»', () => {
    for (const granted of [['pedidos.ver'], ['despacho.gestionar']]) {
      state.granted = granted;
      const view = renderCard();
      expect(screen.getByRole('button', { name: 'Pedidos sin chofer' })).toBeInTheDocument();
      view.unmount();
    }
  });

  it('sin ninguno de los dos no lo ofrece (llevaría a una pantalla sin acceso)', () => {
    state.granted = ['flota.ver'];
    renderCard();
    expect(screen.queryByRole('button', { name: 'Pedidos sin chofer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo pedido telefónico' })).toBeInTheDocument();
  });
});
