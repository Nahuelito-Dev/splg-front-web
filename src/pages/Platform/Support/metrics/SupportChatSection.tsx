import { Clock, Hourglass, MessagesSquare, Ticket } from 'lucide-react';
import { KpiCard, KpiGrid } from '../../../../common/components/ui';
import { FirstResponseNote } from '../../../../features/chat/metrics/FirstResponseNote';
import { formatMetricMinutes, formatPartOf, formatRate } from '../../../../features/chat/metrics/metricsFormat';
import type { SupportChatMetrics } from '../../../../services/api/types';
import { formatNumber } from '../../../../utils/format';

/** El chat en vivo con las empresas: quién espera ahora, cuánto tarda la primera respuesta y cuántos pasan a ticket. */
export const SupportChatSection = ({ chat }: { chat: SupportChatMetrics }) => (
  <section aria-labelledby="support-chat-title" className="grid gap-3">
    <h2 id="support-chat-title" className="text-base font-semibold text-ink">
      Chat con las empresas
    </h2>
    <KpiGrid label="Chat con las empresas" className="sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Esperando ahora"
        icon={Hourglass}
        value={formatNumber(chat.waiting)}
        hint={
          chat.longestWaitMinutes === null
            ? 'Nadie espera respuesta'
            : `La más larga: ${formatMetricMinutes(chat.longestWaitMinutes)} hábiles`
        }
        pill={chat.waiting > 0 ? { text: 'Responder', trend: 'warn' } : undefined}
      />
      <KpiCard
        title="Espera"
        icon={Clock}
        value={formatMetricMinutes(chat.medianWaitMinutes)}
        hint={`Mediana hábil de ${formatNumber(chat.waiting)} esperando`}
      />
      <KpiCard
        title="Primera respuesta"
        icon={MessagesSquare}
        value={formatMetricMinutes(chat.firstResponse.medianMinutes)}
        hint="Mediana, en min hábiles"
      />
      <KpiCard
        title="Terminan en ticket"
        icon={Ticket}
        value={formatRate(chat.endedInTicketRate)}
        hint={`${formatPartOf(chat.endedInTicket, chat.chats)} chats del período`}
      />
    </KpiGrid>
    <FirstResponseNote stats={chat.firstResponse} noun="chats" />
  </section>
);
