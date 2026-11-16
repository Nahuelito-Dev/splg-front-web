import { zodResolver } from '@hookform/resolvers/zod';
import { MousePointerClick, Smartphone } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Card, CardHeader, Checkbox, ErrorState, Form, Skeleton } from '../../../common/components/ui';
import { CUSTOMER_ACTIONS, inCatalogOrder, type CustomerActionKey } from '../../../features/chat/inbox/messageExtras';
import type { ChatSettings } from '../../../services/api/types';
import { useChatSettings, useUpdateChatSettings } from '../../../services/queries/inbox';
import { notify } from '../../../utils/notifications';
import { customerActionsSchema, type CustomerActionsValues } from './settingsSchemas';

const toValues = (s: ChatSettings): CustomerActionsValues => ({ customerActions: inCatalogOrder(s.customerActions) });

/** Cómo ve el cliente los botones al abrir el chat: debajo del primer mensaje, en el orden del catálogo. */
export const CustomerActionsPreview = ({ keys }: { keys: readonly CustomerActionKey[] }) => {
  const shown = CUSTOMER_ACTIONS.filter((action) => keys.includes(action.key));
  return (
    <section
      aria-label="Vista previa de los botones: así los ve el cliente"
      className="rounded-xl border border-outline bg-bg p-3 sm:p-4"
    >
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink">
        <Smartphone aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
        Así los ve el cliente al abrir el chat
      </p>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">Sin botones: el cliente sólo escribe.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Botones del chat">
          {shown.map((action) => (
            <li
              key={action.key}
              className="rounded-full border border-primary-edge bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary"
            >
              {action.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const ActionsForm = ({ settings, canEdit }: { settings: ChatSettings; canEdit: boolean }) => {
  const update = useUpdateChatSettings();
  const methods = useForm<CustomerActionsValues>({
    resolver: zodResolver(customerActionsSchema),
    defaultValues: toValues(settings),
  });
  const { control, reset, watch, formState } = methods;
  const keys = watch('customerActions');

  const onSubmit = (v: CustomerActionsValues) =>
    update.mutate(
      { customerActions: inCatalogOrder(v.customerActions) },
      { onSuccess: () => notify.success('Botones guardados'), onError: (error) => notify.error(error) },
    );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Form methods={methods} onSubmit={onSubmit} className="grid content-start gap-4">
        <Controller
          control={control}
          name="customerActions"
          render={({ field }) => (
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-medium text-ink">Botones que ve el cliente</legend>
              {CUSTOMER_ACTIONS.map((action) => (
                <Checkbox
                  key={action.key}
                  label={action.label}
                  hint={action.text ? `${action.help} Manda: «${action.text}»` : action.help}
                  checked={field.value.includes(action.key)}
                  disabled={!canEdit}
                  onChange={(event) =>
                    field.onChange(
                      event.target.checked
                        ? inCatalogOrder([...field.value, action.key])
                        : field.value.filter((key) => key !== action.key),
                    )
                  }
                />
              ))}
            </fieldset>
          )}
        />
        {canEdit && (
          <div className="flex justify-end gap-2 border-t border-outline-soft pt-4">
            <Button
              variant="secondary"
              aria-label="Descartar los cambios de los botones"
              onClick={() => reset(toValues(settings))}
              disabled={!formState.isDirty || update.isPending}
            >
              Descartar
            </Button>
            <Button
              type="submit"
              aria-label="Guardar los botones"
              loading={update.isPending}
              disabled={!formState.isDirty}
            >
              Guardar
            </Button>
          </div>
        )}
      </Form>
      <div className="xl:sticky xl:top-4 xl:self-start">
        <CustomerActionsPreview keys={keys} />
      </div>
    </div>
  );
};

/** Los botones del chat del cliente (4e): cuáles se muestran, qué hace cada uno y la vista previa. */
export const CustomerActionsCard = ({ canEdit }: { canEdit: boolean }) => {
  const { data, error, isPending, refetch } = useChatSettings();
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Botones del chat del cliente"
        subtitle="Atajos que el cliente toca en vez de escribir. Los mensajes que mandan los atiende el asistente o el equipo como cualquier otro."
        icon={<MousePointerClick className="h-4 w-4" />}
      />
      {isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando los botones">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : (
        <ActionsForm key={JSON.stringify(toValues(data))} settings={data} canEdit={canEdit} />
      )}
    </Card>
  );
};
