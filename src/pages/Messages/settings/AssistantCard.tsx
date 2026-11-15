import { zodResolver } from '@hookform/resolvers/zod';
import { Bot } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Card, CardHeader, ErrorState, Form, FormInput, Skeleton, Switch } from '../../../common/components/ui';
import { useCompanyDisplayName } from '../../../common/components/useCompanyDisplayName';
import { ASSISTANT_NAME_MAX, AUTO_MESSAGE_MAX, TEMPLATE_VARIABLES } from '../../../services/api/inbox';
import { toApiError } from '../../../services/api/errors';
import type { ChatSettings } from '../../../services/api/types';
import { useChatSettings, useUpdateChatSettings } from '../../../services/queries/inbox';
import { notify } from '../../../utils/notifications';
import { AssistantAiToggle } from './AssistantAiToggle';
import { AssistantPreview } from './AssistantPreview';
import { AssistantTextField } from './AssistantTextField';
import { defaultTexts } from './assistantTexts';
import { autoRepliesSchema, type AutoRepliesValues } from './settingsSchemas';

const toValues = (s: ChatSettings): AutoRepliesValues => ({
  customerChatEnabled: s.customerChatEnabled,
  assistantAiEnabled: s.assistantAiEnabled,
  assistantName: s.assistantName ?? '',
  handoffMessage: s.handoffMessage ?? '',
  outOfHoursEnabled: s.outOfHoursEnabled,
  outOfHoursMessage: s.outOfHoursMessage ?? '',
  ackEnabled: s.ackEnabled,
  ackMessage: s.ackMessage ?? '',
  firstResponseTargetMinutes: s.firstResponseTargetMinutes,
});

/** Vacío vuelve al texto de siempre: a la API va `null`, nunca "". */
const orNull = (text: string) => text.trim() || null;

/** Un interruptor con su nombre a la vista (el `Switch` del kit sólo lo lleva como nombre accesible). */
const ToggleRow = ({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) => (
  <div className="flex items-center gap-3">
    <Switch label={label} checked={checked} onChange={onChange} disabled={disabled} />
    <span className="text-sm font-medium text-ink" aria-hidden="true">
      {label}
    </span>
  </div>
);

/** Lo que el asistente con IA reemplaza mientras contesta solo: se ve, se edita, pero no sale. */
const PausedNote = () => <p className="text-xs font-medium text-warn">En pausa mientras el asistente contesta solo</p>;

const MESSAGE_HELP = `Podés usar ${TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(' · ')}. Vacío: el texto de siempre.`;
const NAME_HELP =
  'Firma las respuestas automáticas. Podés usar {{empresa.nombre}}. Vacío: «Asistente de» y la empresa.';

const SettingsForm = ({
  settings,
  canEdit,
  companyName,
  onStale,
}: {
  settings: ChatSettings;
  canEdit: boolean;
  companyName: string;
  /** Relee la configuración (p. ej. si el asistente dejó de estar disponible mientras se miraba). */
  onStale: () => void;
}) => {
  const update = useUpdateChatSettings();
  const methods = useForm<AutoRepliesValues>({
    resolver: zodResolver(autoRepliesSchema),
    defaultValues: toValues(settings),
  });
  const { control, reset, resetField, watch, formState } = methods;
  // Todo lo escrito, para la vista previa (se redibuja con cada tecla: es un formulario chico).
  const values = watch();
  const defaults = defaultTexts(settings);

  // Con el asistente contestando solo, el aviso de recibido y el fuera de horario no salen (siguen editables).
  const aiAnswering = settings.assistantAiAvailable && values.assistantAiEnabled;

  const onSubmit = (v: AutoRepliesValues) => {
    // El interruptor sólo viaja si se tocó: sin la función no se ve, y un `true` guardado no se vuelve a mandar.
    const sendsAi = Boolean(formState.dirtyFields.assistantAiEnabled);
    const turnsAiOn = sendsAi && v.assistantAiEnabled;
    update.mutate(
      {
        customerChatEnabled: v.customerChatEnabled,
        ...(sendsAi ? { assistantAiEnabled: v.assistantAiEnabled } : {}),
        assistantName: orNull(v.assistantName),
        handoffMessage: orNull(v.handoffMessage),
        outOfHoursEnabled: v.outOfHoursEnabled,
        // Apagado, su texto no se manda (queda el guardado): lo escondido no se valida ni puede dar un 400.
        ...(v.outOfHoursEnabled ? { outOfHoursMessage: orNull(v.outOfHoursMessage) } : {}),
        ackEnabled: v.ackEnabled,
        ...(v.ackEnabled ? { ackMessage: orNull(v.ackMessage) } : {}),
        firstResponseTargetMinutes: v.firstResponseTargetMinutes,
      },
      {
        onSuccess: () => notify.success('Asistente guardado'),
        onError: (error) => {
          // Sólo es «ya no se puede prender» si se pidió prenderlo; otro 403 (p. ej. el chat apagado) es el de siempre.
          if (!turnsAiOn || !toApiError(error).moduleDisabled) {
            notify.error(error);
            return;
          }
          // Dejó de estar disponible mientras se miraba: el interruptor vuelve a lo guardado y se esconde al releer.
          notify.warn(
            'El asistente ya no se puede prender. No se guardó nada: volvé a guardar el resto de los cambios.',
          );
          resetField('assistantAiEnabled');
          onStale();
        },
      },
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Form methods={methods} onSubmit={onSubmit} className="grid content-start gap-5">
        {settings.assistantAiAvailable && <AssistantAiToggle disabled={!canEdit} />}
        <div className="grid gap-1">
          <Controller
            control={control}
            name="customerChatEnabled"
            render={({ field }) => (
              <ToggleRow
                label="Los clientes pueden escribir"
                checked={field.value}
                onChange={field.onChange}
                disabled={!canEdit}
              />
            )}
          />
          <p className="text-xs text-muted">
            Apagado, los clientes no abren conversaciones nuevas; las abiertas siguen hasta cerrarse. Los choferes
            siguen igual.
          </p>
        </div>

        <AssistantTextField
          name="assistantName"
          label="Nombre del asistente"
          placeholder={defaults.name}
          max={ASSISTANT_NAME_MAX}
          help={NAME_HELP}
          disabled={!canEdit}
        />

        <div className="grid gap-2">
          <Controller
            control={control}
            name="ackEnabled"
            render={({ field }) => (
              <ToggleRow
                label="Avisar que lo vamos a atender (en horario)"
                checked={field.value}
                onChange={field.onChange}
                disabled={!canEdit}
              />
            )}
          />
          {aiAnswering && <PausedNote />}
          {values.ackEnabled && (
            <AssistantTextField
              name="ackMessage"
              label="Texto del aviso"
              placeholder={defaults.ack}
              max={AUTO_MESSAGE_MAX}
              help={MESSAGE_HELP}
              disabled={!canEdit}
              multiline
            />
          )}
        </div>

        <div className="grid gap-2">
          <Controller
            control={control}
            name="outOfHoursEnabled"
            render={({ field }) => (
              <ToggleRow
                label="Responder fuera de horario"
                checked={field.value}
                onChange={field.onChange}
                disabled={!canEdit}
              />
            )}
          />
          {aiAnswering && <PausedNote />}
          {values.outOfHoursEnabled && (
            <AssistantTextField
              name="outOfHoursMessage"
              label="Texto fuera de horario"
              placeholder={defaults.outOfHours}
              max={AUTO_MESSAGE_MAX}
              help={MESSAGE_HELP}
              disabled={!canEdit}
              multiline
            />
          )}
        </div>

        <AssistantTextField
          name="handoffMessage"
          label="Mensaje al pasar a una persona"
          placeholder={defaults.handoff}
          max={AUTO_MESSAGE_MAX}
          help={`Lo dice el asistente cuando deja la conversación en manos del equipo. ${MESSAGE_HELP}`}
          disabled={!canEdit}
          multiline
        />

        <div className="max-w-xs">
          <FormInput
            name="firstResponseTargetMinutes"
            label="Objetivo de primera respuesta (minutos hábiles)"
            type="number"
            registerOptions={{ valueAsNumber: true }}
            min={5}
            max={1440}
            disabled={!canEdit}
          />
        </div>

        {canEdit && (
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
        )}
      </Form>
      <div className="xl:sticky xl:top-4 xl:self-start">
        <AssistantPreview settings={settings} values={values} companyName={companyName} />
      </div>
    </div>
  );
};

/**
 * El asistente de la empresa: su nombre (firma lo que manda solo), el chat con clientes, el aviso de recibido, el
 * fuera de horario, el mensaje al pasar a una persona y el objetivo de primera respuesta, con la vista previa.
 */
export const AssistantCard = ({ canEdit }: { canEdit: boolean }) => {
  const { data, error, isPending, refetch } = useChatSettings();
  const companyName = useCompanyDisplayName() ?? 'tu empresa';
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Asistente"
        subtitle="Lo que el sistema le responde solo al cliente, firmado con el nombre del asistente y marcado como respuesta automática. Los choferes no reciben automáticas."
        icon={<Bot className="h-4 w-4" />}
      />
      {isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando el asistente">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : (
        // Lo guardado cambió (acá o en otra pestaña): el formulario arranca de nuevo. Releer lo mismo no pisa lo que se escribe.
        <SettingsForm
          key={JSON.stringify(toValues(data))}
          settings={data}
          canEdit={canEdit}
          companyName={companyName}
          onStale={() => void refetch()}
        />
      )}
    </Card>
  );
};
