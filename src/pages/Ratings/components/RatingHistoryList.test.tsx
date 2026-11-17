import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Rating } from '../../../services/api/types';

vi.mock('../../../services/queries/userNames', () => ({
  useUserNames: () => ({ nameOf: (id: string) => (id === 'to-1' ? 'Chofer Pedro' : null), loading: false }),
}));

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true }),
}));
vi.mock('../../../services/queries/ratings', () => ({
  useRating: () => ({ data: undefined, isPending: true, error: null }),
  useModerateRating: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { RatingHistoryList } from './RatingHistoryList';

afterEach(cleanup);

const RATING = {
  rating_id: 'r-1',
  from_user_id: 'from-1',
  to_user_id: 'to-1',
  from_role: 'customer',
  stars: 5,
  comment: 'Muy bien',
  createdAt: '2026-09-02T10:00:00.000Z',
  fromUser: { user_id: 'from-1', full_name: 'Clienta Ana' },
} as unknown as Rating;

describe('RatingHistoryList', () => {
  it('muestra quién calificó a quién, cada uno con enlace a su ficha', () => {
    render(
      <MemoryRouter>
        <RatingHistoryList ratings={[RATING]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Clienta Ana' })).toHaveAttribute('href', '/users/details/from-1');
    expect(screen.getByRole('link', { name: 'Chofer Pedro' })).toHaveAttribute('href', '/users/details/to-1');
  });

  it('una calificación visible se oculta (baja lógica) y una oculta se vuelve a mostrar', () => {
    const hidden = {
      ...RATING,
      rating_id: 'r-2',
      hidden: true,
      hiddenReason: 'Lenguaje ofensivo',
    } as unknown as Rating;
    render(
      <MemoryRouter>
        <RatingHistoryList ratings={[RATING, hidden]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Oculta: Lenguaje ofensivo')).toBeInTheDocument();
    const [visibleMenu, hiddenMenu] = screen.getAllByRole('button', { name: 'Más acciones de calificación' });
    fireEvent.click(visibleMenu);
    expect(screen.getByRole('menuitem', { name: 'Ocultar' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Volver a mostrar' })).toBeNull();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    fireEvent.click(hiddenMenu);
    expect(screen.getByRole('menuitem', { name: 'Volver a mostrar' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Ocultar' })).toBeNull();
  });

  it('sin reseñas lo avisa', () => {
    render(
      <MemoryRouter>
        <RatingHistoryList ratings={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Todavía no recibió calificaciones')).toBeInTheDocument();
  });
});
