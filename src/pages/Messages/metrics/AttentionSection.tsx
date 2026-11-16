import { CheckCheck, Clock, MessageSquareText, Target, TimerOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnalyticSummary, KpiCard, KpiGrid } from '../../../common/components/ui';
import { FirstResponseNote } from '../../../features/chat/metrics/FirstResponseNote';
import { formatMetricMinutes, formatPartOf, formatRate } from '../../../features/chat/metrics/metricsFormat';
import { MESSAGES_SETTINGS_PATH } from '../../../features/chat/routes';
import type { ChatMetrics } from '../../../services/api/types';
import { formatNumber } from '../../../utils/format';

/** Ahora mismo, sin importar el período: lo que la bandeja tiene abierto en el canal elegido. */
export const LiveSummary = ({ live, channelName }: { live: ChatMetrics['live']; channelName: string }) => (
  <AnalyticSummary
    label={`Conversaciones con ${channelName} ahora, en vivo`}
    items={[
      { key: 'open', label: 'Abiertas ahora', count: live.open, tone: 'info' },
      { key: 'unassigned', label: 'Sin asignar', count: live.unassigned, tone: 'warn' },
      { key: 'unanswered', label: 'Sin respuesta', count: live.unanswered, tone: 'danger' },
      { key: 'awaiting', label: 'Esperando a una persona', count: live.awaitingHuman, tone: 'accent' },
    ]}
  />
);

interface Props {
  metrics: ChatMetrics;
  /** Puede cambiar el objetivo (`mensajes.configurar`). */
  canConfigure: boolean;
}

/** Primera respuesta, objetivo y resolución del período. */
export const AttentionSection = ({ metrics, canConfigure }: Props) => {
  const { firstResponse, resolution } = metrics;
  const target = firstResponse.target;
  const measured = target ? target.met + target.missed : 0;
  return (
    <section aria-labelledby="attention-title" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="attention-title" className="text-base font-semibold text-ink">
          Atención
        </h2>
        <p className="text-[13px] text-muted">
          Objetivo de primera respuesta: {formatNumber(metrics.targetMinutes)} min hábiles ·{' '}
          {canConfigure ? (
            <Link to={MESSAGES_SETTINGS_PATH} className="font-medium text-primary underline">
              Cambiar el objetivo
            </Link>
          ) : (
            'para cambiarlo, pedile a quien configura los mensajes.'
          )}
        </p>
      </div>
      <KpiGrid label="Atención del período" className="sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="Conversaciones"
          icon={MessageSquareText}
          value={formatNumber(metrics.conversations)}
          hint="Nuevas en el período"
        />
        <KpiCard
          title="Primera respuesta"
          icon={Clock}
          value={formatMetricMinutes(firstResponse.medianMinutes)}
          hint="Mediana, en min hábiles"
        />
        <KpiCard
          title="Dentro del objetivo"
          icon={Target}
          value={formatRate(target?.rate ?? null)}
          hint={target && measured > 0 ? `${formatPartOf(target.met, measured)} medidas` : 'Sin respuestas medidas'}
        />
        <KpiCard
          title="Sin respuesta del período"
          icon={TimerOff}
          value={formatNumber(firstResponse.unanswered)}
          hint="Abiertas, sin respuesta de una persona"
        />
        <KpiCard
          title="Resolución"
          icon={CheckCheck}
          value={formatMetricMinutes(resolution.medianMinutes)}
          hint={
            resolution.medianMinutes === null
              ? 'Sin conversaciones cerradas'
              : `Mediana de ${formatNumber(resolution.closed)} cerradas, en tiempo corrido (no hábil)`
          }
        />
      </KpiGrid>
      <FirstResponseNote stats={firstResponse} noun="conversaciones" feminine />
    </section>
  );
};
