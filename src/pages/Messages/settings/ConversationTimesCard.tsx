import { zodResolver } from '@hookform/resolvers/zod';
import { Timer } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { Button, Card, CardHeader, ErrorState, Form, FormInput, Skeleton, Switch } from '../../../common/components/ui';
import { formatMinutes } from '../../../features/chat/inbox/inboxLabels';
import {
  conversationTimesSchema,
  inactivityErrorField,
  type ConversationTimesValues,
} from '../../../features/chat/labels/labelSchemas';
import { toApiError } from '../../../services/api/errors';
import {
  INACTIVITY_CLOSE_MAX,
  INACTIVITY_CLOSE_MIN,
  INACTIVITY_WARNING_MAX,
  INACTIVITY_WARNING_MIN,
} from '../../../services/api/inbox';
import type { ChatSettings } from '../../../services/api/types';
import { useChatSettings, useUpdateChatSettings } from '../../../services/queries/inbox';
import { formatDateTime } from '../../../utils/format';
import { notify } from '../../../utils/notifications';

/** Lo que se propone al prender algo apagado (el back no tiene valor por omisión). */
const SUGGESTED_CLOSE = 1440;
const SUGGESTED_WARNING = 60;

const toValues = (s: ChatSettings): ConversationTimesValues => ({
  expectedReplyEnabled: s.expectedReplyEnabled,
  inactivityEnabled: s.inactivityCloseMinutes !== null,
  closeMinutes: s.inactivityCloseMinutes ?? SUGGESTED_CLOSE,
  warningEnabled: s.inactivityWarningMinutes !== null,
  warningMinutes: s.inactivityWarningMinutes ?? SUGGESTED_WARNING,
});

/** El rango y, aparte, el valor escrito en horas: «De 30 a 10080 minutos · ahora: 1 h 30 min». */
const rangeHint = (range: string, minutes: number) =>
  Number.isInteger(minutes) && minutes > 0 ? `${range} · ahora: ${formatMinutes(minutes)}` : range;

type BooleanField = 'expectedReplyEnabled' | 'inactivityEnabled' | 'warningEnabled';

const ToggleRow = ({
  control,
  name,
  label,
  help,
  disabled,
}: {
  control: Control<ConversationTimesValues>;
  name: BooleanField;
  label: string;
  help: string;
  disabled: boolean;
}) => (
  <div className="grid gap-1">
    <div className="flex items-center gap-3">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch
            label={label}
            checked={field.value}
            onChange={field.onChange}
            disabled={disabled}
            describedBy={`${name}-help`}
          />
        )}
      />
      <span className="text-sm font-medium text-ink" aria-hidden="true">
        {label}
      </span>
    </div>
    <p id={`${name}-help`} className="text-xs text-ink-2">
      {help}
    </p>
  </div>
);

const TimesForm = ({ settings, canEdit }: { settings: ChatSettings; canEdit: boolean }) => {
  const update = useUpdateChatSettings();
  const methods = useForm<ConversationTimesValues>({
    resolver: zodResolver(conversationTimesSchema),
    defaultValues: toValues(settings),
  });
  const { control, reset, watch, setError, formState } = methods;
  const [formError, setFormError] = useState<string | null>(null);
  const values = watch();
  const disabled = !canEdit;

  const onSubmit = (v: ConversationTimesValues) => {
    setFormError(null);
    update.mutate(
      {
        expectedReplyEnabled: v.expectedReplyEnabled,
        inactivityCloseMinutes: v.inactivityEnabled ? v.closeMinutes : null,
        inactivityWarningMinutes: v.inactivityEnabled && v.warningEnabled ? v.warningMinutes : null,
      },
      {
        onSuccess: () => notify.success('Tiempos guardados'),
        onError: (cause) => {
          const error = toApiError(cause);
          if (error.status !== 400) {
            setFormError(error.messages.join('. '));
            return;
          }
          // Cada mensaje del 400 junto a su campo; lo que no es de ninguno, al pie.
          const general: string[] = [];
          for (const message of error.messages) {
            const field = inactivityErrorField(message);
            if (field) setError(field, { type: 'server', message }, { shouldFocus: true });
            else general.push(message);
          }
          setFormError(general.length ? general.join('. ') : null);
        },
      },
    );
  };

  const target = settings.firstResponseTargetMinutes;
  return (
    <Form methods={methods} onSubmit={onSubmit} className="grid content-start gap-5">
      <section aria-label="Tiempo de respuesta esperado" className="grid gap-3">
        <ToggleRow
          control={control}
          name="expectedReplyEnabled"
          label="Mostrar el tiempo de respuesta esperado"
          help="El cliente y el chofer lo ven antes de escribir. Sale de cómo respondió el equipo en los últimos 14 días; con pocas conversaciones, del objetivo de primera respuesta."
          disabled={disabled}
        />
        <div
          aria-label="Vista previa del tiempo esperado"
          role="note"
          className="rounded-xl border border-outline bg-bg px-3 py-2.5 text-sm"
        >
          {values.expectedReplyEnabled ? (
            <>
              <span className="text-muted">Así lo ven: </span>
              <span className="font-medium text-ink">«Solemos responder en ~{formatMinutes(target)}»</span>
              <span className="block text-xs text-muted">
                Ejemplo con el objetivo de {formatMinutes(target)}. Fuera de horario ven cuándo vuelve a atender la
                empresa.
              </span>
            </>
          ) : (
            <span className="text-muted">No ven ningún tiempo de respuesta.</span>
          )}
        </div>
      </section>

      <section aria-label="Cierre por inactividad" className="grid gap-3 border-t border-outline-soft pt-5">
        <ToggleRow
          control={control}
          name="inactivityEnabled"
          label="Cerrar las conversaciones sin respuesta"
          help="Si lo último lo dijo el equipo o el asistente y el cliente o el chofer no contesta, la conversación se cierra sola. Si contesta, el plazo vuelve a empezar. Fuera de horario no se cierra."
          disabled={disabled}
        />
        {values.inactivityEnabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              name="closeMinutes"
              label="Se cierra a los (minutos)"
              type="number"
              inputMode="numeric"
              min={INACTIVITY_CLOSE_MIN}
              max={INACTIVITY_CLOSE_MAX}
              registerOptions={{ valueAsNumber: true }}
              hint={rangeHint(`De ${INACTIVITY_CLOSE_MIN} a ${INACTIVITY_CLOSE_MAX} minutos`, values.closeMinutes)}
              disabled={disabled}
            />
            <div className="grid content-start gap-3">
              <ToggleRow
                control={control}
                name="warningEnabled"
                label="Avisar antes de cerrar"
                help="Le llega «Si no tenés más consultas, cerramos la conversación en …»."
                disabled={disabled}
              />
              {values.warningEnabled && (
                <FormInput
                  name="warningMinutes"
                  label="Avisa estos minutos antes"
                  type="number"
                  inputMode="numeric"
                  min={INACTIVITY_WARNING_MIN}
                  max={INACTIVITY_WARNING_MAX}
                  registerOptions={{ valueAsNumber: true }}
                  hint={rangeHint(
                    `De ${INACTIVITY_WARNING_MIN} a ${INACTIVITY_WARNING_MAX} minutos, menos que el cierre`,
                    values.warningMinutes,
                  )}
                  disabled={disabled}
                />
              )}
            </div>
          </div>
        )}
        {settings.inactivityEnabledAt && (
          <p className="text-xs text-muted">
            Rige desde el {formatDateTime(settings.inactivityEnabledAt)}: lo que pasó antes no cuenta. Cambiar los
            minutos vuelve a empezar la cuenta.
          </p>
        )}
      </section>

      {formError && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}
      {canEdit && (
        <div className="flex justify-end gap-2 border-t border-outline-soft pt-4">
          <Button
            variant="secondary"
            aria-label="Descartar los cambios de los tiempos"
            onClick={() => {
              setFormError(null);
              reset(toValues(settings));
            }}
            disabled={!formState.isDirty || update.isPending}
          >
            Descartar
          </Button>
          <Button
            type="submit"
            aria-label="Guardar los tiempos"
            loading={update.isPending}
            disabled={!formState.isDirty}
          >
            Guardar
          </Button>
        </div>
      )}
    </Form>
  );
};

/** El tiempo de respuesta que ven el cliente y el chofer, y el cierre solo de las conversaciones sin respuesta. */
export const ConversationTimesCard = ({ canEdit }: { canEdit: boolean }) => {
  const { data, error, isPending, refetch } = useChatSettings();
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Tiempos de la conversación"
        subtitle="Qué tiempo de respuesta se promete y cuándo se cierra sola una conversación que nadie sigue."
        icon={<Timer className="h-4 w-4" />}
      />
      {isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando los tiempos">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : (
        <TimesForm key={JSON.stringify(toValues(data))} settings={data} canEdit={canEdit} />
      )}
    </Card>
  );
};
