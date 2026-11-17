import { TableroBarList, type TableroBarTone } from '../../../common/components/ui';
import type { ScoreCount } from '../../../services/api/types';
import { formatNumber } from '../../../utils/format';

/** Del 1 al 5: de lo peor (rojo) a lo mejor (verde). */
const TONES: TableroBarTone[] = ['danger', 'warn', 'neutral', 'info', 'success'];
const toneOf = (score: number): TableroBarTone => (score >= 1 ? TONES.at(score - 1) : undefined) ?? 'neutral';

/** Cuántas respuestas tuvo cada puntaje de la encuesta, del 5 al 1 (la API manda siempre los cinco). */
export const ScoreBars = ({ byScore }: { byScore: ScoreCount[] }) => (
  <TableroBarList
    label="Respuestas por puntaje"
    items={[...byScore]
      .sort((a, b) => b.score - a.score)
      .map(({ score, count }) => ({
        id: String(score),
        label: `${score} de 5`,
        value: count,
        valueLabel: formatNumber(count),
        tone: toneOf(score),
      }))}
  />
);
