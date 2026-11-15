import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Select } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { InboxConversation } from '../../../services/api/types';
import { useAdmins } from '../../../services/queries/admins';
import { useAssignConversation } from '../../../services/queries/inbox';
import { notify } from '../../../utils/notifications';

interface Props {
  conversation: InboxConversation | null;
  myUserId: string | undefined;
  onClose: () => void;
}

const QUEUE = '';

/**
 * Asignar una conversación a alguien del personal (o devolverla a la cola). La API decide quién puede atender el canal:
 * si la persona elegida no tiene el permiso, responde 400 `ASSIGNEE_WITHOUT_PERMISSION` y se muestra.
 */
export const AssignModal = ({ conversation, myUserId, onClose }: Props) => {
  const open = Boolean(conversation);
  const admins = useAdmins();
  const assign = useAssignConversation();
  const [userId, setUserId] = useState(QUEUE);
  const [error, setError] = useState<string | null>(null);

  // Sólo al abrir (o al cambiar de conversación): un aviso del socket que refresca la ficha no pisa lo elegido.
  const current = conversation?.assignedTo?.userId ?? QUEUE;
  const currentRef = useRef(current);
  currentRef.current = current;
  const conversationId = conversation?.id;
  useEffect(() => {
    if (!conversationId) return;
    setUserId(currentRef.current);
    setError(null);
  }, [conversationId]);

  if (!conversation) return null;

  const options = [
    { value: QUEUE, label: 'Nadie: queda en la cola' },
    ...(admins.data ?? [])
      .filter((admin) => !admin.user?.blocked && !admin.user?.deletedAt)
      .map((admin) => ({
        value: admin.user_id,
        label: `${admin.user?.full_name ?? admin.user?.email ?? 'Sin nombre'}${admin.user_id === myUserId ? ' (vos)' : ''}`,
      })),
  ];

  const save = () => {
    setError(null);
    assign.mutate(
      { id: conversation.id, userId: userId || null },
      {
        onSuccess: (updated) => {
          notify.success(updated.assignedTo ? `Asignada a ${updated.assignedTo.fullName}` : 'Volvió a la cola');
          onClose();
        },
        onError: (cause) => setError(errorMessage(cause)),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={assign.isPending}
      title="Asignar la conversación"
      description="Quien la atiende la ve en «Mías». El cliente o el chofer no ve quién es: ve la marca de la empresa."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={assign.isPending}>
            Cancelar
          </Button>
          <Button onClick={save} loading={assign.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select
          label="Atiende"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          options={options}
          disabled={admins.isPending}
          error={error ?? undefined}
          hint={admins.error ? 'No se pudo leer el personal: podés devolverla a la cola.' : undefined}
        />
      </div>
    </Modal>
  );
};
