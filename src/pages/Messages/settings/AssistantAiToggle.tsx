import { Sparkles } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Switch } from '../../../common/components/ui';
import { ASSISTANT_FAQS_PATH } from '../../../features/chat/routes';
import type { AutoRepliesValues } from './settingsSchemas';

export const ASSISTANT_AI_LABEL = 'El asistente contesta solo';
const HELP_ID = 'assistant-ai-help';

/**
 * El interruptor del asistente que contesta solo a los clientes. Sólo se dibuja si la empresa lo puede usar
 * (`assistantAiAvailable`); si no, no aparece ni se explica por qué.
 */
export const AssistantAiToggle = ({ disabled }: { disabled: boolean }) => {
  const { control } = useFormContext<AutoRepliesValues>();
  return (
    <section
      aria-label={ASSISTANT_AI_LABEL}
      className="grid gap-2 rounded-card border border-outline-soft bg-surface-sunken p-4"
    >
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="assistantAiEnabled"
          render={({ field }) => (
            <Switch
              label={ASSISTANT_AI_LABEL}
              checked={field.value}
              onChange={field.onChange}
              disabled={disabled}
              describedBy={HELP_ID}
            />
          )}
        />
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink" aria-hidden="true">
          <Sparkles className="h-4 w-4 text-primary" />
          {ASSISTANT_AI_LABEL}
        </span>
      </div>
      <div id={HELP_ID} className="grid gap-1.5 text-xs text-ink-2">
        <p>
          Cuando nadie del equipo atiende la conversación, contesta las preguntas frecuentes y el estado del pedido del
          cliente que escribe. Si no está seguro, le pasa la conversación a una persona y queda marcada «Esperando a
          alguien del equipo» en la bandeja.
        </p>
        <p>
          Sus respuestas van firmadas con el nombre del asistente y siempre marcadas como respuesta automática. Mientras
          está prendido, reemplaza el aviso de recibido y la respuesta fuera de horario.
        </p>
        <p>
          Contesta con las preguntas de{' '}
          <Link to={ASSISTANT_FAQS_PATH} className="font-medium text-primary underline">
            Asistente del chat
          </Link>
          : cuanto más completas, mejor responde.
        </p>
      </div>
    </section>
  );
};
