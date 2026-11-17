import { Clock, Tag } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../common/components/ui';
import { LabelList } from '../../../features/chat/labels/LabelList';
import type { InboxConversation } from '../../../services/api/types';
import { LabelsEditorModal } from './LabelsEditorModal';

interface Props {
  conversation: InboxConversation;
  /** Puede poner y sacar etiquetas (atiende el canal de la conversación y no está en sólo lectura). */
  canLabel: boolean;
  /** Puede crear etiquetas en la configuración. */
  canConfigure: boolean;
}

/**
 * Debajo del encabezado de la conversación: sus etiquetas (con el editor) y, discreto, el tiempo de respuesta que ve
 * hoy el cliente o el chofer en ese canal (`expectedReply`, sólo en el detalle).
 */
export const ConversationMeta = ({ conversation, canLabel, canConfigure }: Props) => {
  const [editing, setEditing] = useState(false);
  const labels = conversation.labels ?? [];
  const expected = conversation.expectedReply;
  const who = conversation.channel === 'staff_driver' ? 'El chofer' : 'El cliente';
  if (labels.length === 0 && !canLabel && !(expected?.enabled && expected.text)) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-outline-soft px-3 py-1.5">
      <LabelList labels={labels} className="min-w-0" />
      {canLabel && (
        <Button
          size="sm"
          variant="ghost"
          icon={<Tag />}
          onClick={() => setEditing(true)}
          aria-label={labels.length ? 'Cambiar las etiquetas' : 'Poner etiquetas'}
        >
          {labels.length ? 'Etiquetas' : 'Poner etiquetas'}
        </Button>
      )}
      {expected?.enabled && expected.text && (
        <p className="ml-auto inline-flex min-w-0 items-center gap-1 text-[11px] text-muted">
          <Clock aria-hidden="true" className="h-3 w-3 shrink-0" />
          <span className="min-w-0">
            {who} ve: «{expected.text}»
          </span>
        </p>
      )}
      {editing && (
        <LabelsEditorModal
          key={conversation.id}
          conversation={conversation}
          canConfigure={canConfigure}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
};
