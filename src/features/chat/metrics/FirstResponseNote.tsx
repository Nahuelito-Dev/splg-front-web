import type { FirstResponseStats } from '../../../services/api/types';
import { formatNumber } from '../../../utils/format';
import { formatMetricMinutes } from './metricsFormat';

interface Props {
  stats: FirstResponseStats;
  /** Qué se cuenta: «conversaciones», «chats», «tickets». */
  noun: string;
  /** Para concordar: «respondidas / cerradas» o «respondidos / cerrados». */
  feminine?: boolean;
}

/**
 * La base de la mediana de la primera respuesta: cuántas se midieron, el p90 en palabras y las que se cerraron sin
 * respuesta de una persona (no entran en la mediana ni en el objetivo).
 */
export const FirstResponseNote = ({ stats, noun, feminine = false }: Props) => {
  const end = feminine ? 'as' : 'os';
  return (
    <p className="text-[13px] text-muted">
      Primera respuesta: mediana de {formatNumber(stats.responded)} {noun} respondid{end}
      {stats.p90Minutes !== null && (
        <>; 9 de cada 10, en {formatMetricMinutes(stats.p90Minutes)} hábiles o menos</>
      )}. {formatNumber(stats.closedWithoutHumanReply)} cerrad{end} sin respuesta de una persona: no se miden.
    </p>
  );
};
