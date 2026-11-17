import { zodResolver } from '@hookform/resolvers/zod';
import { Shuffle } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button, Card, CardHeader, ErrorState, Form, FormInput, Skeleton, Switch } from '../../../common/components/ui';
import {
  autoAssignSchema,
  isMaxOpenError,
  type AutoAssignValues,
} from '../../../features/chat/assignment/assignmentSchemas';
import { MESSAGES_TEAM_PATH } from '../../../features/chat/routes';
import { AUTO_ASSIGN_MAX_OPEN_MAX, AUTO_ASSIGN_MAX_OPEN_MIN } from '../../../services/api/chatAssignment';
import { toApiError } from '../../../services/api/errors';
import type { ChatSettings } from '../../../services/api/types';
import { useChatSettings, useUpdateChatSettings } from '../../../services/queries/inbox';
import { confirm, notify } from '../../../utils/notifications';

export const AUTO_ASSIGN_LABEL = 'Asignar solas las conversaciones';
const HELP_ID = 'auto-assign-help';

const toValues = (s: ChatSettings): AutoAssignValues => ({
  autoAssignEnabled: s.autoAssignEnabled,
  autoAssignMaxOpen: s.autoAssignMaxOpen,
});

const AutoAssignForm = ({ settings, canEdit }: { settings: ChatSettings; canEdit: boolean }) => {
  const update = useUpdateChatSettings();
  const methods = useForm<AutoAssignValues>({
    resolver: zodResolver(autoAssignSchema),
    defaultValues: toValues(settings),
  });
  const { control, reset, setError, formState } = methods;
  const [formError, setFormError] = useState<string | null>(null);
  const disabled = !canEdit;

  const onSubmit = async (v: AutoAssignValues) => {
    setFormError(null);
    // Al apagarla se limpian las esperas que puso la asignación: se avisa antes.
    if (settings.autoAssignEnabled && !v.autoAssignEnabled) {
      const ok = await confirm({
        title: '¿Apagar la asignación automática?',
        text: 'Las conversaciones que esperaban que se las diera a alguien quedan en «Sin asignar» sin la marca «Esperando a alguien del equipo». Las que pidieron hablar con una persona siguen esperando. Lo ya asignado no cambia.',
        confirmText: 'Apagar',
      });
      if (!ok) return;
    }
    // Sólo lo que cambió: cada cambio con la función prendida reparte lo que espera.
    const body = {
      ...(v.autoAssignEnabled !== settings.autoAssignEnabled ? { autoAssignEnabled: v.autoAssignEnabled } : {}),
      ...(v.autoAssignMaxOpen !== settings.autoAssignMaxOpen ? { autoAssignMaxOpen: v.autoAssignMaxOpen } : {}),
    };
    update.mutate(body, {
      onSuccess: () => notify.success('Asignación automática guardada'),
      onError: (cause) => {
        const error = toApiError(cause);
        if (error.status !== 400) {
          setFormError(error.messages.join('. '));
          return;
        }
        const general: string[] = [];
        for (const message of error.messages) {
          if (isMaxOpenError(message)) {
            setError('autoAssignMaxOpen', { type: 'server', message }, { shouldFocus: true });
          } else general.push(message);
        }
        setFormError(general.length ? general.join('. ') : null);
      },
    });
  };

  return (
    <Form methods={methods} onSubmit={onSubmit} className="grid content-start gap-5">
      <div className="grid gap-1">
        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="autoAssignEnabled"
            render={({ field }) => (
              <Switch
                label={AUTO_ASSIGN_LABEL}
                checked={field.value}
                onChange={field.onChange}
                disabled={disabled}
                describedBy={HELP_ID}
              />
            )}
          />
          <span className="text-sm font-medium text-ink" aria-hidden="true">
            {AUTO_ASSIGN_LABEL}
          </span>
        </div>
        <div id={HELP_ID} className="grid gap-1.5 text-xs text-ink-2">
          <p>
            Cuando un cliente o un chofer queda esperando a alguien del equipo, la conversación se le da sola a quien
            está «En línea» en la bandeja, atiende ese canal y tiene más lugar libre (menos abiertas respecto de su
            tope).
          </p>
          <p>
            Si alguien del equipo ya le respondió, vuelve a esa persona mientras esté en línea y tenga lugar. Si no hay
            nadie con lugar, queda en «Sin asignar» y se reparte apenas alguien se pone en línea, cierra una o le suben
            el tope. Fuera del horario de atención no se reparte.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:max-w-xs">
        <FormInput
          name="autoAssignMaxOpen"
          label="Tope de conversaciones abiertas por persona"
          type="number"
          inputMode="numeric"
          min={AUTO_ASSIGN_MAX_OPEN_MIN}
          max={AUTO_ASSIGN_MAX_OPEN_MAX}
          registerOptions={{ valueAsNumber: true }}
          hint={`De ${AUTO_ASSIGN_MAX_OPEN_MIN} a ${AUTO_ASSIGN_MAX_OPEN_MAX}. Cuenta las asignadas a mano y las solas.`}
          disabled={disabled}
        />
      </div>
      <p className="text-xs text-muted">
        Cada persona puede tener un tope propio en{' '}
        <Link to={MESSAGES_TEAM_PATH} className="font-medium text-primary underline">
          Equipo de mensajes
        </Link>
        . Asignar a mano puede pasar el tope.
      </p>
      {formError && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}
      {canEdit && (
        <div className="flex justify-end gap-2 border-t border-outline-soft pt-4">
          <Button
            variant="secondary"
            aria-label="Descartar los cambios de la asignación automática"
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
            aria-label="Guardar la asignación automática"
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

/** «Asignación automática» (8b): prenderla, el tope general y cómo reparte. Edita quien tiene `mensajes.configurar`. */
export const AutoAssignCard = ({ canEdit }: { canEdit: boolean }) => {
  const { data, error, isPending, refetch } = useChatSettings();
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Asignación automática"
        subtitle="A quién se le da sola una conversación que espera a alguien del equipo."
        icon={<Shuffle className="h-4 w-4" />}
      />
      {isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando la asignación automática">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : (
        <AutoAssignForm key={JSON.stringify(toValues(data))} settings={data} canEdit={canEdit} />
      )}
    </Card>
  );
};
