import { describe, expect, it } from 'vitest';
import type { Rating } from '../../services/api/types';
import { resolveRatingStats } from './ratingStats';

const rating = (stars: number): Rating =>
  ({
    rating_id: crypto.randomUUID(),
    order_id: crypto.randomUUID(),
    distributor_id: crypto.randomUUID(),
    from_user_id: crypto.randomUUID(),
    to_user_id: crypto.randomUUID(),
    from_role: 'customer',
    stars,
    comment: null,
    createdAt: new Date().toISOString(),
  }) satisfies Rating;

describe('resolveRatingStats', () => {
  it('usa el resumen de la API cuando ya cuenta calificaciones', () => {
    expect(resolveRatingStats({ average: 4.5, count: 12 }, [rating(1)])).toEqual({ average: 4.5, count: 12 });
  });

  it('sin resumen con datos, calcula el promedio del historial', () => {
    expect(resolveRatingStats({ average: 0, count: 0 }, [rating(4), rating(5), rating(3)])).toEqual({
      average: 4,
      count: 3,
    });
  });

  it('sin resumen ni historial, queda en cero', () => {
    expect(resolveRatingStats(undefined, [])).toEqual({ average: 0, count: 0 });
    expect(resolveRatingStats(undefined, undefined)).toEqual({ average: 0, count: 0 });
  });

  it('redondea el promedio calculado a dos decimales', () => {
    expect(resolveRatingStats({ average: 0, count: 0 }, [rating(5), rating(4), rating(4)])).toEqual({
      average: 4.33,
      count: 3,
    });
  });
});
