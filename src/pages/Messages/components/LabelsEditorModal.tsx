import { Settings2, Tags } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Checkbox, EmptyState, ErrorState, Modal, Skeleton } from '../../../common/components/ui';
import { LabelChip } from '../../../features/chat/labels/LabelChip';
import { MESSAGES_SETTINGS_PATH } from '../../../features/chat/routes';
import { CONVERSATION_LABELS_MAX } from '../../../services/api/chatLabels';
import { toApiError } from '../../../services/api/errors';
import type { InboxConversation } from '../../../services/api/types';
import { useChatLabels, useSetConversationLabels } from '../../../services/queries/chatLabels';
import { notify } from '../../../utils/notifications';

interface Props {
  /** Se monta al abrir: lo marcado arranca de sus etiquetas y no se pisa si la ficha se relee (llega un mensaje). */
  conversation: InboxConversation;
  /** Puede crear etiquetas (`mensajes.configurar`): el vacío ofrece ir a la configuración. */
  canConfigure: boolean;
  onClose: () => void;
}

/** Poner y sacar etiquetas de una conversación (hasta 5): se guarda la lista entera (la API reemplaza). */
export const LabelsEditorModal = ({ conversation, canConfigure, onClose }: Props) => {
  // Al abrir se pide de nuevo: una etiqueta recién creada aparece sin esperar.
  const catalog = useChatLabels(true, true);
  const save = useSetConversationLabels();
  const [selected, setSelected] = useState<string[]>(() => (conversation.labels ?? []).map((label) => label.id));
  const [error, setError] = useState<string | null>(null);

  const items = catalog.data?.items ?? [];
  const full = selected.length >= CONVERSATION_LABELS_MAX;
  const current = (conversation.labels ?? []).map((label) => label.id);
  const changed = selected.length !== current.length || selected.some((id) => !current.includes(id));

  const toggle = (labelId: string, checked: boolean) =>
    setSelected((list) => (checked ? [...list, labelId] : list.filter((id) => id !== labelId)));

  const onSave = () => {
    setError(null);
    save.mutate(
      { id: conversation.id, labelIds: selected },
      {
        onSuccess: () => {
          notify.success('Etiquetas guardadas');
          onClose();
        },
        onError: (cause) => {
          const apiError = toApiError(cause);
          setError(apiError.messages.join('. '));
          // Alguna se dio de baja mientras se elegía: se relee el catálogo.
          if (apiError.notFound) void catalog.refetch();
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={save.isPending}
      title="Etiquetas de la conversación"
      description={`Hasta ${CONVERSATION_LABELS_MAX}. Sólo las ve el equipo: el cliente y el chofer nunca.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button onClick={onSave} loading={save.isPending} disabled={!changed || items.length === 0}>
            Guardar
          </Button>
        </>
      }
    >
      {catalog.isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando las etiquetas">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ) : catalog.error ? (
        <ErrorState error={catalog.error} resource="Las etiquetas" onRetry={() => void catalog.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="La empresa no tiene etiquetas"
          description={
            canConfigure ? 'Creálas en la configuración de los mensajes.' : 'Las crea quien configura los mensajes.'
          }
          action={
            canConfigure && (
              <Link to={MESSAGES_SETTINGS_PATH} className="inline-flex items-center gap-1.5 font-medium text-primary">
                <Settings2 aria-hidden="true" className="h-4 w-4" />
                Ir a la configuración
              </Link>
            )
          }
        />
      ) : (
        <fieldset className="grid gap-2">
          <legend className="sr-only">Etiquetas</legend>
          {items.map((label) => {
            const checked = selected.includes(label.id);
            return (
              <Checkbox
                key={label.id}
                label={label.name}
                checked={checked}
                disabled={!checked && full}
                onChange={(event) => toggle(label.id, event.target.checked)}
              />
            );
          })}
          <p className="text-xs text-muted" aria-live="polite">
            {selected.length} de {CONVERSATION_LABELS_MAX}
            {full && ': para poner otra, sacá alguna.'}
          </p>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1" aria-hidden="true">
              {items
                .filter((label) => selected.includes(label.id))
                .map((label) => (
                  <LabelChip key={label.id} name={label.name} color={label.color} size="xs" />
                ))}
            </div>
          )}
        </fieldset>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}
    </Modal>
  );
};
