import { Inbox } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, EmptyState, ErrorState, Modal, SearchInput, Skeleton } from '../../../common/components/ui';
import { errorMessage, toApiError } from '../../../services/api/errors';
import type { InboxConversation } from '../../../services/api/types';
import { useAssignConversation, useConversationAssignees } from '../../../services/queries/inbox';
import { notify } from '../../../utils/notifications';
import { AssigneeOption } from './AssigneeOption';
import { ASSIGNEE_SEARCH_FROM, orderAssignees } from './assigneeOptions';

interface Props {
  conversation: InboxConversation | null;
  myUserId: string | undefined;
  onClose: () => void;
}

const QUEUE = '';

/**
 * La API rechazó a quien se eligió: 400 `ASSIGNEE_WITHOUT_PERMISSION` (ya no atiende el canal) o 404 (la persona ya no
 * es del personal, o la conversación ya no existe o es de un canal que quien mira no atiende). La lista quedó vieja.
 */
const isStaleChoice = (cause: unknown): boolean => {
  const error = toApiError(cause);
  return error.notFound || error.code === 'ASSIGNEE_WITHOUT_PERMISSION';
};

/** El texto de la API, más qué hacer si la lista quedó vieja. */
const assignError = (cause: unknown): string => {
  const text = errorMessage(cause).replace(/\.$/, '');
  return isStaleChoice(cause) ? `${text}. Actualizamos la lista: elegí de nuevo.` : text;
};

/**
 * Asignar una conversación a alguien del personal (o devolverla a la cola). La lista la da la API
 * (`/assignees`: quien atiende el canal de esa conversación), con quien mira primero («Yo») y un buscador si son
 * muchos. Si alguien perdió el permiso (400 `ASSIGNEE_WITHOUT_PERMISSION`) o dejó de existir (404) entre que se abrió y
 * se guardó, se avisa con el motivo de la API y se relee la lista.
 */
export const AssignModal = ({ conversation, myUserId, onClose }: Props) => {
  const open = Boolean(conversation);
  const assignees = useConversationAssignees(conversation?.id);
  const assign = useAssignConversation();
  // `null`: nadie elegido (la persona que estaba ya no está en la lista): «Guardar» espera otra elección.
  const [userId, setUserId] = useState<string | null>(QUEUE);
  const [term, setTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sólo al abrir (o al cambiar de conversación): un aviso del socket que refresca la ficha no pisa lo elegido.
  const current = conversation?.assignedTo?.userId ?? QUEUE;
  const currentRef = useRef(current);
  currentRef.current = current;
  const conversationId = conversation?.id;
  useEffect(() => {
    if (!conversationId) return;
    setUserId(currentRef.current);
    setTerm('');
    setError(null);
  }, [conversationId]);

  if (!conversation) return null;

  const items = assignees.data?.items ?? [];
  const searchable = items.length > ASSIGNEE_SEARCH_FROM;
  const visible = orderAssignees(items, myUserId, searchable ? term : '');
  const busy = assign.isPending;
  const inList = (id: string) => items.some((person) => person.userId === id);
  // Quien la atiende ya no atiende el canal (perdió el permiso o la baja): se ve, pero no se puede volver a elegir.
  const orphan =
    assignees.data && conversation.assignedTo && !inList(conversation.assignedTo.userId)
      ? conversation.assignedTo
      : null;
  const canSave = userId === QUEUE || (userId !== null && inList(userId));

  const save = () => {
    setError(null);
    assign.mutate(
      { id: conversation.id, userId: userId === QUEUE ? null : userId },
      {
        onSuccess: (updated) => {
          notify.success(updated.assignedTo ? `Asignada a ${updated.assignedTo.fullName}` : 'Volvió a la cola');
          onClose();
        },
        onError: (cause) => {
          setError(assignError(cause));
          if (isStaleChoice(cause)) {
            // Vuelve a lo que estaba sólo si sigue en la lista nueva; si no, nadie elegido.
            void assignees.refetch().then(({ data }) => {
              const before = currentRef.current;
              const stays = before === QUEUE || Boolean(data?.items.some((person) => person.userId === before));
              setUserId(stays ? before : null);
            });
          }
        },
      },
    );
  };

  const list = assignees.isPending ? (
    <div className="grid gap-2" role="status" aria-label="Cargando el personal">
      {[0, 1, 2].map((n) => (
        <div key={n} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="h-[30px] w-[30px] rounded-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  ) : assignees.error ? (
    <ErrorState
      error={assignees.error}
      resource="La conversación"
      notFoundDescription="Puede haberse cerrado o ser de un canal que no atendés."
      onRetry={() => void assignees.refetch()}
    />
  ) : items.length === 0 ? (
    <EmptyState
      title="Nadie del personal atiende este canal"
      description="Dale a alguien del personal el permiso de este canal para poder asignársela."
    />
  ) : visible.length === 0 ? (
    <EmptyState title="Sin resultados" description={`Nadie se llama «${term.trim()}».`} illustration="search" />
  ) : (
    visible.map((person) => {
      const me = person.userId === myUserId;
      return (
        <AssigneeOption
          key={person.userId}
          name={person.fullName}
          label={me ? 'Yo' : undefined}
          detail={me ? person.fullName : undefined}
          photoUrl={person.photoUrl}
          value={person.userId}
          checked={userId === person.userId}
          onSelect={setUserId}
          disabled={busy}
        />
      );
    })
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={busy}
      title="Asignar la conversación"
      description="Quien la atiende la ve en «Mías». El cliente o el chofer no ve quién es: ve la marca de la empresa."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy} disabled={!canSave}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {searchable && (
          <SearchInput
            label="Buscar a alguien del personal"
            placeholder="Nombre"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            className="sm:w-full"
          />
        )}
        <fieldset className="grid max-h-[50vh] gap-2 overflow-y-auto">
          <legend className="sr-only">Atiende</legend>
          <AssigneeOption
            name="Nadie"
            detail="Vuelve a la cola de «Sin asignar»"
            icon={
              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border border-outline text-muted">
                <Inbox aria-hidden="true" className="h-4 w-4" />
              </span>
            }
            value={QUEUE}
            checked={userId === QUEUE}
            onSelect={setUserId}
            disabled={busy}
          />
          {orphan && (
            <AssigneeOption
              name={orphan.fullName}
              label={`Asignada a ${orphan.fullName}`}
              detail="Ya no atiende este canal: elegí a otra persona"
              value={orphan.userId}
              checked={userId === orphan.userId}
              onSelect={setUserId}
              disabled
            />
          )}
          {list}
        </fieldset>
        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};
