import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquareQuote, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Form,
  FormInput,
  FormSelect,
  FormTextArea,
  Modal,
  RowActions,
  Skeleton,
  Switch,
} from '../../../common/components/ui';
import { CHANNEL_LABEL } from '../../../features/chat/inbox/inboxLabels';
import {
  TEMPLATE_BODY_MAX,
  TEMPLATE_KEY_MAX,
  TEMPLATE_TITLE_MAX,
  TEMPLATE_VARIABLES,
} from '../../../services/api/inbox';
import type { CompanyTemplate } from '../../../services/api/types';
import {
  useCompanyTemplates,
  useCreateCompanyTemplate,
  useDeleteCompanyTemplate,
  useUpdateCompanyTemplate,
} from '../../../services/queries/inbox';
import { confirm, notify } from '../../../utils/notifications';
import { keyFromTitle, templateSchema, type TemplateValues } from './settingsSchemas';

const CHANNEL_OPTIONS = [
  { value: 'both', label: 'Clientes y choferes' },
  { value: 'staff_customer', label: 'Sólo clientes' },
  { value: 'staff_driver', label: 'Sólo choferes' },
];

const EMPTY: TemplateValues = { title: '', key: '', body: '', channel: 'both', active: true };

const toValues = (t: CompanyTemplate): TemplateValues => ({
  title: t.title,
  key: t.key,
  body: t.body,
  channel: t.channel ?? 'both',
  active: t.active,
});

interface ModalProps {
  /** `null`: cerrado; `'new'`: alta; una plantilla: edición. */
  editing: CompanyTemplate | 'new' | null;
  onClose: () => void;
}

const TemplateModal = ({ editing, onClose }: ModalProps) => {
  const create = useCreateCompanyTemplate();
  const update = useUpdateCompanyTemplate();
  const methods = useForm<TemplateValues>({ resolver: zodResolver(templateSchema), defaultValues: EMPTY });
  const { reset, control, setValue, getFieldState, formState } = methods;
  const pending = create.isPending || update.isPending;
  const isNew = editing === 'new';

  useEffect(() => {
    if (editing) reset(editing === 'new' ? EMPTY : toValues(editing));
  }, [editing, reset]);

  if (!editing) return null;

  const onSubmit = (values: TemplateValues) => {
    const body = {
      title: values.title.trim(),
      key: values.key.trim(),
      body: values.body.trim(),
      channel: values.channel === 'both' ? null : values.channel,
      active: values.active,
    };
    const done = {
      onSuccess: () => {
        notify.success(isNew ? 'Respuesta guardada creada' : 'Respuesta guardada actualizada');
        onClose();
      },
      onError: (error: unknown) => notify.error(error),
    };
    if (editing === 'new') create.mutate(body, done);
    else update.mutate({ id: editing.id, body }, done);
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={pending}
      title={isNew ? 'Nueva respuesta guardada' : 'Editar respuesta guardada'}
      description="Aparece en el compositor de la bandeja al escribir «/». Las variables se completan al enviar."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="company-template" loading={pending}>
            Guardar
          </Button>
        </>
      }
    >
      <Form methods={methods} id="company-template" onSubmit={onSubmit} className="space-y-4">
        <FormInput
          name="title"
          label="Título"
          required
          maxLength={TEMPLATE_TITLE_MAX}
          placeholder="Ej: Pedido en camino"
          registerOptions={{
            onChange: (event: { target: { value: string } }) => {
              // La clave sale del título mientras nadie la tocó a mano (en el alta).
              if (isNew && !getFieldState('key', formState).isDirty) {
                setValue('key', keyFromTitle(event.target.value));
              }
            },
          }}
        />
        <FormInput
          name="key"
          label="Clave"
          required
          maxLength={TEMPLATE_KEY_MAX}
          hint="Única entre las vigentes; se busca escribiendo «/clave»"
        />
        <FormSelect name="channel" label="Se ofrece en" options={CHANNEL_OPTIONS} />
        <FormTextArea
          name="body"
          label="Texto"
          required
          rows={4}
          maxLength={TEMPLATE_BODY_MAX}
          hint={`Variables: ${TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(' · ')}`}
        />
        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch label="Activa" checked={field.value} onChange={field.onChange} />
              <span className="text-sm text-ink" aria-hidden="true">
                Activa (se ofrece en el compositor)
              </span>
            </div>
          )}
        />
      </Form>
    </Modal>
  );
};

/** Respuestas guardadas de la empresa (`/` en el compositor): alta, edición, activar y baja lógica. */
export const TemplatesCard = ({ canEdit }: { canEdit: boolean }) => {
  const { data, error, isPending, refetch } = useCompanyTemplates();
  const remove = useDeleteCompanyTemplate();
  const [editing, setEditing] = useState<CompanyTemplate | 'new' | null>(null);
  const items = data?.items ?? [];

  const askRemove = async (template: CompanyTemplate) => {
    const ok = await confirm({
      title: `¿Dar de baja «${template.title}»?`,
      text: 'Deja de ofrecerse en el compositor. Los mensajes ya enviados con ella quedan como están.',
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(template.id, {
      onSuccess: () => notify.success('Respuesta guardada dada de baja'),
      onError: (cause) => notify.error(cause),
    });
  };

  return (
    <Card>
      <CardHeader
        title="Respuestas guardadas"
        subtitle="Textos frecuentes para responder rápido. «/» en el compositor las abre."
        icon={<MessageSquareQuote className="h-4 w-4" />}
        action={
          canEdit && (
            <Button size="sm" icon={<Plus />} onClick={() => setEditing('new')}>
              Nueva
            </Button>
          )
        }
      />
      {isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando las respuestas guardadas">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} resource="Las respuestas guardadas" onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="Sin respuestas guardadas"
          description="Por ejemplo: «Tu pedido {{pedido.numero}} ya salió»."
          action={
            canEdit && (
              <Button variant="secondary" icon={<Plus />} onClick={() => setEditing('new')}>
                Crear la primera
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-outline-soft" aria-label="Respuestas guardadas">
          {items.map((template) => (
            <li key={template.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  {template.title}
                  <span className="font-mono text-xs text-muted">/{template.key}</span>
                  <Badge
                    label={
                      template.channel
                        ? CHANNEL_LABEL[template.channel]
                        : { text: 'Clientes y choferes', tone: 'neutral' }
                    }
                  />
                  {!template.active && <Badge label={{ text: 'Inactiva', tone: 'neutral' }} />}
                </p>
                <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-xs text-ink-2">
                  {template.body}
                </p>
              </div>
              {canEdit && (
                <RowActions
                  rowLabel={`respuesta «${template.title}»`}
                  onEdit={() => setEditing(template)}
                  onDelete={() => void askRemove(template)}
                  deleteLabel="Dar de baja"
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <TemplateModal editing={editing} onClose={() => setEditing(null)} />
    </Card>
  );
};
