import { useEffect, useState } from 'react';
import { Button, Modal, Select } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { TicketSummary } from '../../../services/api/types';
import { useAddTicketExcerpt, type ChatSide } from '../../../services/queries/supportChat';

interface Props {
  open: boolean;
  onClose: () => void;
  side: ChatSide;
  conversationId: string;
  range: { fromSeq: number; toSeq: number; size: number };
  /** Los tickets abiertos desde este chat que todavía no se cerraron. */
  tickets: TicketSummary[];
  onDone: (ticket: TicketSummary) => void;
}

/** «Agregar al ticket…»: copia los mensajes elegidos del chat al hilo de un ticket ya abierto. */
export const AddExcerptModal = ({ open, onClose, side, conversationId, range, tickets, onDone }: Props) => {
  const mutation = useAddTicketExcerpt(side);
  const [ticketId, setTicketId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTicketId(tickets[0]?.id ?? '');
      setError(null);
    }
  }, [open, tickets]);

  const submit = async () => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      setError('Elegí el ticket');
      return;
    }
    setError(null);
    try {
      await mutation.mutateAsync({
        ticketId,
        body: { sourceConversationId: conversationId, fromSeq: range.fromSeq, toSeq: range.toSeq },
      });
      onDone(ticket);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={mutation.isPending}
      size="sm"
      title="Agregar al ticket"
      description={`Se copian ${range.size} ${range.size === 1 ? 'mensaje' : 'mensajes'} del chat al hilo del ticket. El chat queda igual.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} loading={mutation.isPending} disabled={tickets.length === 0}>
            Agregar
          </Button>
        </>
      }
    >
      {tickets.length === 0 ? (
        <p className="text-sm text-muted">
          No hay tickets abiertos desde este chat: abrí uno nuevo con estos mensajes.
        </p>
      ) : (
        <div className="grid gap-3">
          {error && (
            <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Select
            label="Ticket"
            value={ticketId}
            onChange={(event) => setTicketId(event.target.value)}
            options={tickets.map((t) => ({ value: t.id, label: `${t.number} · ${t.subject}` }))}
          />
        </div>
      )}
    </Modal>
  );
};
