import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePersonPhoto } from '../../../services/queries/peoplePhotos';
import { BoardCard } from './BoardCard';
import { card } from './boardFixtures';

afterEach(cleanup);

const renderCard = () =>
  render(
    <ul>
      <BoardCard
        card={card({ id: 'c1' })}
        column="forecast"
        canMove
        dragging={false}
        onDragOverCard={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        onOpen={vi.fn()}
        onMoveTo={vi.fn()}
        onCancel={vi.fn()}
      />
    </ul>,
  );

type PhotoQuery = ReturnType<typeof usePersonPhoto>;

describe('BoardCard: foto del responsable', () => {
  it('pide la foto por el legajo del asignado y la muestra', () => {
    vi.mocked(usePersonPhoto).mockClear();
    vi.mocked(usePersonPhoto).mockReturnValue({
      data: { url: 'https://fotos.test/juan.jpg', expiresAt: '2030-01-01T00:00:00.000Z' },
      refetch: vi.fn(),
    } as unknown as PhotoQuery);
    const { container } = renderCard();
    expect(usePersonPhoto).toHaveBeenCalledWith({ kind: 'employee', id: 'e-1' });
    expect(container.querySelector('img[src="https://fotos.test/juan.jpg"]')).not.toBeNull();
  });

  it('sin foto quedan las iniciales', () => {
    vi.mocked(usePersonPhoto).mockReturnValue({ data: null, refetch: vi.fn() } as unknown as PhotoQuery);
    const { container } = renderCard();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('PJ')).toBeInTheDocument();
  });
});
