import { MailCheck, Smile, Star } from 'lucide-react';
import { KpiCard, KpiGrid, TableroWidget } from '../../../common/components/ui';
import { formatPartOf, formatRate, formatScore } from '../../../features/chat/metrics/metricsFormat';
import { ScoreBars } from '../../../features/chat/metrics/ScoreBars';
import type { ChatSatisfaction } from '../../../services/api/types';
import { formatNumber } from '../../../utils/format';

/** La encuesta al cerrar con los clientes: promedio, tasa de respuesta y cómo se reparten los puntajes. */
export const SatisfactionSection = ({ satisfaction }: { satisfaction: ChatSatisfaction }) => (
  <section aria-labelledby="satisfaction-title" className="grid gap-3">
    <h2 id="satisfaction-title" className="text-base font-semibold text-ink">
      Satisfacción de los clientes
    </h2>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <KpiGrid label="Encuesta al cerrar" className="content-start sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <KpiCard
          title="Promedio"
          icon={Star}
          value={formatScore(satisfaction.average)}
          hint={`${formatNumber(satisfaction.answered)} respuestas`}
        />
        <KpiCard
          title="Respondieron la encuesta"
          icon={MailCheck}
          value={formatRate(satisfaction.responseRate)}
          hint={`${formatPartOf(satisfaction.answered, satisfaction.requested)} pedidas`}
        />
        <KpiCard title="Satisfechos" icon={Smile} value={formatRate(satisfaction.csat)} hint="Calificaron con 4 o 5" />
      </KpiGrid>
      <TableroWidget
        title="Puntajes"
        subtitle="Cuántas respuestas tuvo cada puntaje."
        empty={satisfaction.answered === 0 ? { title: 'Sin respuestas a la encuesta en el período' } : null}
      >
        <ScoreBars byScore={satisfaction.byScore} />
      </TableroWidget>
    </div>
  </section>
);
