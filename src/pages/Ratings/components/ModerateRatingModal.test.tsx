import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const moderate = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/ratings', () => ({
  useModerateRating: () => ({ mutate: moderate, isPending: false }),
}));

import type { Rating } from '../../../services/api/types';
import { ModerateRatingModal } from './ModerateRatingModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ModerateRatingModal: motivo de hasta 500', () => {
  const rating = { rating_id: 'r1', hidden: false } as Rating;

  it('un motivo de más de 500 caracteres no se envía', () => {
    render(<ModerateRatingModal rating={rating} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'a'.repeat(501) } });
    const confirm = screen.getByRole('button', { name: 'Ocultar' });
    fireEvent.mouseDown(confirm);
    fireEvent.click(confirm);
    expect(screen.getByText('No puede superar 500 caracteres')).toBeInTheDocument();
    expect(moderate).not.toHaveBeenCalled();
  });

  it('uno de 500 se envía', () => {
    render(<ModerateRatingModal rating={rating} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'a'.repeat(500) } });
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(moderate).toHaveBeenCalledOnce();
  });
});
