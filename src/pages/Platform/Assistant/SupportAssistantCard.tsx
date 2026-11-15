import { zodResolver } from '@hookform/resolvers/zod';
import { Bot } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Card, CardHeader, ErrorState, Form, FormInput, Skeleton, Switch } from '../../../common/components/ui';
import {
  ASSISTANT_REPLIES_MAX,
  ASSISTANT_REPLIES_MIN,
  ASSISTANT_TOKENS_MAX,
  ASSISTANT_TOKENS_MIN,
} from '../../../services/api/supportChat';
import type { SupportSettings } from '../../../services/api/types';
import { useSupportSettings, useUpdateSupportSettings } from '../../../services/queries/supportChat';
import { formatNumber, formatUsdApprox } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { supportAssistantSchema, type SupportAssistantValues } from './assistantSettingsSchema';

const SWITCH_LABEL = 'El asistente contesta en el chat de soporte';
const SWITCH_HELP_ID = 'support-assistant-help';

const toValues = (s: SupportSettings): SupportAssistantValues => ({
  assistantAiEnabled: s.assistantAiEnabled,
  assistantRepliesPerConversation: s.assistantRepliesPerConversation,
  assistantMonthlyTokenLimit: s.assistantMonthlyTokenLimit,
});

/**
 * Lo que costaría consumir todo el tope guardado, tal como lo calcula el back (`assistantMonthlyCostEstimateUsd`).
 * Mientras se cambia el tope, se aclara que el estimado es el del guardado.
 */
const CostEstimate = ({
  estimate,
  editing,
}: {
  estimate: SupportSettings['assistantMonthlyCostEstimateUsd'];
  editing: boolean;
}) => (
  <p className="text-xs text-ink-2" aria-live="polite">
    <span className="font-medium text-ink">
      {`Entre ${formatUsdApprox(estimate.min)} y ${formatUsdApprox(estimate.max)} por mes, estimado`}
    </span>
    {` por empresa si consume todo el tope (el soporte, aparte). Es aproximado: no es lo que se factura.${editing ? ' Es el del tope guardado: se recalcula al guardar.' : ''}`}
  </p>
);

const SettingsForm = ({ settings }: { settings: SupportSettings }) => {
  const update = useUpdateSupportSettings();
  const methods = useForm<SupportAssistantValues>({
    resolver: zodResolver(supportAssistantSchema),
    defaultValues: toValues(settings),
  });
  const { control, reset, formState } = methods;

  const onSubmit = (values: SupportAssistantValues) =>
    update.mutate(values, {
      onSuccess: () => notify.success('Asistente del soporte guardado'),
      onError: (error) => notify.error(error),
    });

  return (
    <Form methods={methods} onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-1.5">
        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="assistantAiEnabled"
            render={({ field }) => (
              <Switch
                label={SWITCH_LABEL}
                checked={field.value}
                onChange={field.onChange}
                describedBy={SWITCH_HELP_ID}
              />
            )}
          />
          <span className="text-sm font-medium text-ink" aria-hidden="true">
            {SWITCH_LABEL}
          </span>
        </div>
        <p id={SWITCH_HELP_ID} className="text-xs text-ink-2">
          Contesta a las distribuidoras con las preguntas de OrixTech cuando nadie del soporte tomó el chat. Si no está
          seguro, pasa el chat a una persona y queda marcado «Esperando a alguien del equipo». Sus respuestas siempre
          van marcadas como respuesta automática.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          name="assistantRepliesPerConversation"
          label="Respuestas del asistente por conversación"
          type="number"
          inputMode="numeric"
          registerOptions={{ valueAsNumber: true }}
          min={ASSISTANT_REPLIES_MIN}
          max={ASSISTANT_REPLIES_MAX}
          hint={`De ${ASSISTANT_REPLIES_MIN} a ${ASSISTANT_REPLIES_MAX}. Al llegar, pasa la conversación a una persona.`}
        />
        <FormInput
          name="assistantMonthlyTokenLimit"
          label="Tokens por mes"
          type="number"
          inputMode="numeric"
          registerOptions={{ valueAsNumber: true }}
          min={ASSISTANT_TOKENS_MIN}
          max={ASSISTANT_TOKENS_MAX}
          step={1000}
          hint={`De ${formatNumber(ASSISTANT_TOKENS_MIN)} a ${formatNumber(ASSISTANT_TOKENS_MAX)}. Al llegar, sólo las respuestas automáticas fijas.`}
        />
      </div>
      <p className="-mt-2 text-xs text-muted">
        Los dos topes valen para el soporte y para el chat de cada empresa con sus clientes.
      </p>
      <CostEstimate
        estimate={settings.assistantMonthlyCostEstimateUsd}
        editing={Boolean(formState.dirtyFields.assistantMonthlyTokenLimit)}
      />

      <div className="flex justify-end gap-2 border-t border-outline-soft pt-4">
        <Button
          variant="secondary"
          onClick={() => reset(toValues(settings))}
          disabled={!formState.isDirty || update.isPending}
        >
          Descartar
        </Button>
        <Button type="submit" loading={update.isPending} disabled={!formState.isDirty}>
          Guardar
        </Button>
      </div>
    </Form>
  );
};

/** El asistente con IA del soporte de OrixTech: si contesta y sus topes de respuestas y de tokens. */
export const SupportAssistantCard = () => {
  const { data, error, isPending, refetch } = useSupportSettings(true);
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Respuestas del asistente"
        subtitle="Si el asistente contesta solo en el chat de soporte y hasta dónde puede gastar."
        icon={<Bot className="h-4 w-4" />}
      />
      {isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando el asistente del soporte">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} resource="La configuración del soporte" onRetry={() => void refetch()} />
      ) : (
        // Lo guardado cambió (acá o en otra pestaña): el formulario arranca de nuevo.
        <SettingsForm key={JSON.stringify(toValues(data))} settings={data} />
      )}
    </Card>
  );
};
