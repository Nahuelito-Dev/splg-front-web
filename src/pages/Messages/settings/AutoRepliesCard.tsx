import { zodResolver } from '@hookform/resolvers/zod';
import { Bot } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Form,
  FormInput,
  FormTextArea,
  Skeleton,
  Switch,
} from '../../../common/components/ui';
import { AUTO_MESSAGE_MAX, TEMPLATE_VARIABLES } from '../../../services/api/inbox';
import type { ChatSettings } from '../../../services/api/types';
import { useChatSettings, useUpdateChatSettings } from '../../../services/queries/inbox';
import { notify } from '../../../utils/notifications';
import { autoRepliesSchema, type AutoRepliesValues } from './settingsSchemas';

const toValues = (s: ChatSettings): AutoRepliesValues => ({
  customerChatEnabled: s.customerChatEnabled,
  outOfHoursEnabled: s.outOfHoursEnabled,
  outOfHoursMessage: s.outOfHoursMessage ?? '',
  ackEnabled: s.ackEnabled,
  ackMessage: s.ackMessage ?? '',
  firstResponseTargetMinutes: s.firstResponseTargetMinutes,
});

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

const VARIABLES_HINT = `Variables: ${TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(' · ')}. Vacío: el texto de siempre.`;

const SettingsForm = ({ settings, canEdit }: { settings: ChatSettings; canEdit: boolean }) => {
  const update = useUpdateChatSettings();
  const methods = useForm<AutoRepliesValues>({
    resolver: zodResolver(autoRepliesSchema),
    defaultValues: toValues(settings),
  });
  const { control, reset, watch, formState } = methods;
  const outOfHours = watch('outOfHoursEnabled');
  const ack = watch('ackEnabled');

  const onSubmit = (values: AutoRepliesValues) =>
    update.mutate(
      {
        customerChatEnabled: values.customerChatEnabled,
        outOfHoursEnabled: values.outOfHoursEnabled,
        // Vacío vuelve al texto de siempre (`null`).
        outOfHoursMessage: values.outOfHoursMessage.trim() || null,
        ackEnabled: values.ackEnabled,
        ackMessage: values.ackMessage.trim() || null,
        firstResponseTargetMinutes: values.firstResponseTargetMinutes,
      },
      { onSuccess: () => notify.success('Respuestas automáticas guardadas'), onError: (error) => notify.error(error) },
    );

  return (
    <Form methods={methods} onSubmit={onSubmit} className="grid gap-5">
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
          Apagado, los clientes no abren conversaciones nuevas; las abiertas siguen hasta cerrarse. Los choferes siguen
          igual.
        </p>
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
        {outOfHours && (
          <FormTextArea
            name="outOfHoursMessage"
            label="Texto fuera de horario"
            rows={3}
            maxLength={AUTO_MESSAGE_MAX}
            placeholder={settings.effectiveOutOfHoursMessage}
            hint={VARIABLES_HINT}
            disabled={!canEdit}
          />
        )}
      </div>

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
        {ack && (
          <FormTextArea
            name="ackMessage"
            label="Texto del aviso"
            rows={3}
            maxLength={AUTO_MESSAGE_MAX}
            placeholder={settings.effectiveAckMessage}
            hint={VARIABLES_HINT}
            disabled={!canEdit}
          />
        )}
      </div>

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
  );
};

/** Respuestas automáticas y reglas de la bandeja: chat con clientes, fuera de horario, aviso de recibido, objetivo. */
export const AutoRepliesCard = ({ canEdit }: { canEdit: boolean }) => {
  const { data, error, isPending, refetch } = useChatSettings();
  return (
    <Card>
      <CardHeader
        title="Respuestas automáticas"
        subtitle="Las manda el sistema con la marca de la empresa. Los choferes no reciben automáticas."
        icon={<Bot className="h-4 w-4" />}
      />
      {isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando las respuestas automáticas">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : (
        // Lo guardado cambió (acá o en otra pestaña): el formulario arranca de nuevo. Releer lo mismo no pisa lo que se escribe.
        <SettingsForm key={JSON.stringify(toValues(data))} settings={data} canEdit={canEdit} />
      )}
    </Card>
  );
};
