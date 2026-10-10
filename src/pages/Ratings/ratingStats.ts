import type { Rating, RatingSummary } from '../../services/api/types';

/**
 * El promedio y la cantidad a mostrar. Si el resumen de la API todavía no
 * tiene calificaciones contadas, se calcula con el historial recibido: cubre
 * el caso de un perfil recién calificado o de un resumen aún sin datos. Las calificaciones ocultas no cuentan.
 */
export const resolveRatingStats = (
  summary: RatingSummary | undefined,
  history: Rating[] | undefined,
): RatingSummary => {
  if (summary && summary.count > 0) return summary;
  // Las ocultas no cuentan (la API las deja fuera del resumen).
  const ratings = (history ?? []).filter((rating) => !rating.hidden);
  if (ratings.length === 0) return { average: 0, count: 0 };
  const total = ratings.reduce((acc, rating) => acc + rating.stars, 0);
  return { average: Math.round((total / ratings.length) * 100) / 100, count: ratings.length };
};
