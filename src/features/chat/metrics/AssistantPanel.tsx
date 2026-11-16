import { Bot, CircleCheck, Forward } from 'lucide-react';
import { KpiCard, KpiGrid, TableroBarList, TableroWidget } from '../../../common/components/ui';
import type { AssistantMetrics } from '../../../services/api/types';
import { formatNumber } from '../../../utils/format';
import { formatPartOf, formatRate } from './metricsFormat';

interface Props {
  assistant: AssistantMetrics;
  /** Quién es el atendido en el texto: «clientes» (empresa) o «empresas» (soporte). */
  audience: string;
}

/** Lo que hizo el asistente en el período: resueltas sin persona, respuestas y derivaciones con su motivo. */
export const AssistantPanel = ({ assistant, audience }: Props) => {
  const reasons = assistant.handoffReasons.map((reason) => ({
    id: reason.reason,
    label: reason.label,
    value: reason.count,
    valueLabel: formatNumber(reason.count),
  }));
  return (
    <div className="grid gap-4">
      <KpiGrid label="Asistente" className="sm:grid-cols-3">
        <KpiCard
          title="Resueltas sin una persona"
          icon={CircleCheck}
          value={formatRate(assistant.resolvedWithoutHumanRate)}
          hint={`${formatPartOf(assistant.resolvedWithoutHuman, assistant.closedWithAssistant)} cerradas con el asistente`}
        />
        <KpiCard
          title="Respuestas del asistente"
          icon={Bot}
          value={formatNumber(assistant.aiReplies)}
          hint={`En ${formatNumber(assistant.conversationsAttended)} conversaciones`}
        />
        <KpiCard
          title="Pasadas a una persona"
          icon={Forward}
          value={formatNumber(assistant.handoffs)}
          hint="Derivaciones del período"
        />
      </KpiGrid>
      <TableroWidget
        title="Por qué pasó la conversación a una persona"
        subtitle={`Motivos de las derivaciones del asistente con ${audience}.`}
        empty={reasons.length === 0 ? { title: 'Sin derivaciones en el período' } : null}
      >
        <TableroBarList items={reasons} label="Motivos de derivación" />
      </TableroWidget>
    </div>
  );
};
