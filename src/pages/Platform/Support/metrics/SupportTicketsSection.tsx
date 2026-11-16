import { CheckCheck, Clock, Star, Target, Ticket } from 'lucide-react';
import { KpiCard, KpiGrid, TableroWidget } from '../../../../common/components/ui';
import {
  formatMetricMinutes,
  formatPartOf,
  formatRate,
  formatScore,
} from '../../../../features/chat/metrics/metricsFormat';
import { FirstResponseNote } from '../../../../features/chat/metrics/FirstResponseNote';
import { ScoreBars } from '../../../../features/chat/metrics/ScoreBars';
import type { SupportTicketMetrics } from '../../../../services/api/types';
import { formatNumber } from '../../../../utils/format';

/** Los tickets: abiertos y vencidos ahora, primera respuesta contra el vencimiento, resolución y la calificación. */
export const SupportTicketsSection = ({ tickets }: { tickets: SupportTicketMetrics }) => {
  const { firstResponse, resolution, satisfaction } = tickets;
  const target = firstResponse.target;
  const measured = target ? target.met + target.missed : 0;
  return (
    <section aria-labelledby="support-tickets-title" className="grid gap-3">
      <h2 id="support-tickets-title" className="text-base font-semibold text-ink">
        Tickets
      </h2>
      <KpiGrid label="Tickets" className="sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="Abiertos ahora"
          icon={Ticket}
          value={formatNumber(tickets.open)}
          hint={`${formatNumber(tickets.created)} creados en el período`}
          pill={
            tickets.overdue > 0
              ? { text: `${formatNumber(tickets.overdue)} vencidos`, trend: 'down' }
              : { text: 'Sin vencidos', trend: 'up' }
          }
        />
        <KpiCard
          title="Primera respuesta"
          icon={Clock}
          value={formatMetricMinutes(firstResponse.medianMinutes)}
          hint="Mediana, en min hábiles"
        />
        <KpiCard
          title="Antes del vencimiento"
          icon={Target}
          value={formatRate(target?.rate ?? null)}
          hint={target && measured > 0 ? `${formatPartOf(target.met, measured)} medidos` : 'Sin respuestas medidas'}
        />
        <KpiCard
          title="Resolución"
          icon={CheckCheck}
          value={formatMetricMinutes(resolution.medianMinutes)}
          hint={
            resolution.medianMinutes === null
              ? 'Sin tickets resueltos'
              : `Mediana de ${formatNumber(resolution.resolved)} resueltos, en tiempo corrido (no hábil)`
          }
        />
        <KpiCard
          title="Calificación"
          icon={Star}
          value={formatScore(satisfaction.average)}
          hint={`${formatNumber(satisfaction.rated)} calificados · ${formatRate(satisfaction.responseRate)} de los cerrados`}
        />
      </KpiGrid>
      <FirstResponseNote stats={firstResponse} noun="tickets" />
      <TableroWidget
        title="Calificación de los tickets"
        subtitle="Cuántos tickets tuvo cada puntaje al confirmarlos."
        empty={satisfaction.rated === 0 ? { title: 'Sin tickets calificados en el período' } : null}
      >
        <ScoreBars byScore={satisfaction.byScore} />
      </TableroWidget>
    </section>
  );
};
