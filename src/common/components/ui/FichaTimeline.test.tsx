import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FichaTimeline } from './FichaTimeline';

afterEach(cleanup);

describe('FichaTimeline', () => {
  it('resalta el hito actual y marca los pendientes', () => {
    render(
      <FichaTimeline
        items={[
          { id: 'a', title: 'Creado', when: '1 oct 2026, 10:00', actor: 'Por Ana', state: 'done' },
          { id: 'b', title: 'En camino', state: 'current' },
          { id: 'c', title: 'Entregado', state: 'pending' },
        ]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    const actual = screen.getByText('En camino').closest('li');
    expect(actual).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Estado actual')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('1 oct 2026, 10:00')).toBeInTheDocument();
    expect(screen.getByText('Por Ana')).toBeInTheDocument();
  });

  it('un hito cancelado se anuncia como estado actual con su motivo', () => {
    render(<FichaTimeline items={[{ id: 'x', title: 'Cancelado', note: 'Sin stock', state: 'cancelled' }]} />);
    expect(screen.getByText('Estado actual')).toBeInTheDocument();
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
  });
});
