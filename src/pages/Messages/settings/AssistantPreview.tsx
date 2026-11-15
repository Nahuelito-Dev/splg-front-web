import { Smartphone } from 'lucide-react';
import { cx, PersonAvatar } from '../../../common/components/ui';
import { AutomatedMark } from '../../../features/chat/components/AutomatedMark';
import { nextOpeningText } from '../../../features/chat/inbox/inboxLabels';
import { fillVariables } from '../../../features/chat/variables';
import type { ChatSettings } from '../../../services/api/types';
import type { AutoRepliesValues } from './settingsSchemas';
import { assistantTexts } from './assistantTexts';

/** Datos de ejemplo para completar las variables (la vista previa no es una conversación real). */
const EXAMPLE_CUSTOMER = 'Ana';
const EXAMPLE_ORDER = '1024';
const EXAMPLE_NEXT_OPENING = 'mañana a las 9:00';

interface Props {
  settings: ChatSettings;
  /** Lo que está escrito en el formulario (todavía sin guardar). */
  values: AutoRepliesValues;
  companyName: string;
}

const PreviewMessage = ({
  caption,
  signature,
  text,
  off,
}: {
  caption: string;
  signature: string;
  text: string;
  off: boolean;
}) => (
  <li className={cx('grid gap-1', off && 'opacity-60')}>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
      {caption}
      {off && <span className="ml-1 font-medium normal-case tracking-normal">· apagado</span>}
    </p>
    <div className="flex items-end gap-2">
      <PersonAvatar name={signature} userId={null} size="sm" decorative className="h-7 w-7 shrink-0 text-[11px]" />
      <div className="flex min-w-0 flex-col items-start">
        <span className="mb-0.5 flex flex-wrap items-center gap-1 px-1 text-[11px] font-medium text-muted">
          {signature}
          <AutomatedMark />
        </span>
        <p className="whitespace-pre-wrap break-words rounded-2xl border border-outline bg-surface px-3 py-2 text-sm text-ink">
          {text}
        </p>
      </div>
    </div>
  </li>
);

/**
 * Cómo ve el cliente lo que manda el asistente: el aviso de recibido, el fuera de horario y el de pasar a una persona,
 * firmados con el nombre del asistente y con la marca «Respuesta automática». Las variables se completan con datos de
 * ejemplo; se actualiza mientras se escribe.
 */
export const AssistantPreview = ({ settings, values, companyName }: Props) => {
  const texts = assistantTexts(settings, values);
  const nextOpening =
    !settings.openNow && settings.nextOpenAt
      ? (nextOpeningText(false, settings.nextOpenAt) ?? EXAMPLE_NEXT_OPENING)
      : EXAMPLE_NEXT_OPENING;
  const fill = (text: string) =>
    fillVariables(text, {
      'cliente.nombre': EXAMPLE_CUSTOMER,
      'pedido.numero': EXAMPLE_ORDER,
      'empresa.nombre': companyName,
      'horario.proximo': nextOpening,
    }).text;
  // Sin cambios en el nombre, la firma es la que da la API (con el nombre de la empresa que usa el back).
  const signature = texts.nameIsSaved ? settings.effectiveAssistantName : fill(texts.name);

  return (
    <section
      aria-label="Vista previa: así lo ve el cliente"
      className="rounded-xl border border-outline bg-bg p-3 sm:p-4"
    >
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink">
        <Smartphone aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
        Así lo ve el cliente
      </p>
      <ul className="grid gap-4">
        <PreviewMessage
          caption="Al escribir en horario"
          signature={signature}
          text={fill(texts.ack)}
          off={!values.ackEnabled}
        />
        <PreviewMessage
          caption="Fuera de horario"
          signature={signature}
          text={fill(texts.outOfHours)}
          off={!values.outOfHoursEnabled}
        />
        <PreviewMessage caption="Al pasar a una persona" signature={signature} text={fill(texts.handoff)} off={false} />
      </ul>
      <p className="mt-3 text-[11px] text-muted">
        Ejemplo con la clienta «{EXAMPLE_CUSTOMER}» y el pedido {EXAMPLE_ORDER}.
      </p>
    </section>
  );
};
