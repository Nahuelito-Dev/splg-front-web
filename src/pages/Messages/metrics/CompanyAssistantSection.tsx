import { Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState } from '../../../common/components/ui';
import { AssistantPanel } from '../../../features/chat/metrics/AssistantPanel';
import { MESSAGES_SETTINGS_PATH } from '../../../features/chat/routes';
import type { CompanyAssistantMetrics } from '../../../services/api/types';

/** Si el asistente hizo algo en el período (aunque hoy esté apagado, lo que hizo se muestra). */
const hasActivity = (assistant: CompanyAssistantMetrics) =>
  assistant.aiReplies + assistant.handoffs + assistant.conversationsAttended > 0;

/** Lo que el asistente le contestó solo a los clientes. Apagado, lo dice y lleva a prenderlo. */
interface Props {
  assistant: CompanyAssistantMetrics;
  /** Puede prenderlo (`mensajes.configurar`). */
  canConfigure: boolean;
}

export const CompanyAssistantSection = ({ assistant, canConfigure }: Props) => {
  const navigate = useNavigate();
  return (
    <section aria-labelledby="assistant-title" className="grid gap-3">
      <h2 id="assistant-title" className="text-base font-semibold text-ink">
        Asistente con los clientes
      </h2>
      {!assistant.enabled && (
        <Card>
          <EmptyState
            icon={Bot}
            title="El asistente está apagado"
            description={
              canConfigure
                ? 'Para que conteste solo las preguntas frecuentes y el estado del pedido de tus clientes, prendé «El asistente contesta solo» en Mensajes y horario.'
                : 'Puede contestar solo las preguntas frecuentes y el estado del pedido de tus clientes. Para prenderlo, pedile a quien configura los mensajes.'
            }
            action={
              canConfigure ? (
                <Button variant="secondary" onClick={() => navigate(MESSAGES_SETTINGS_PATH)}>
                  Ir a Mensajes y horario
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}
      {(assistant.enabled || hasActivity(assistant)) && (
        <AssistantPanel assistant={assistant} audience="los clientes" />
      )}
    </section>
  );
};
