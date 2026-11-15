import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../common/components/ui';
import type { MessageDto, TicketSummary } from '../../../services/api/types';
import { chatKeys, type ChatSide } from '../../../services/queries/supportChat';
import type { ThreadData } from '../thread';
import { notify } from '../../../utils/notifications';
import { DEFAULT_SELECTION_MS, rangeError, rangeOf } from '../ticketForms';
import { AddExcerptModal } from './AddExcerptModal';
import { OpenTicketModal } from './OpenTicketModal';

interface Options {
  side: ChatSide;
  conversationId: string | null;
  /** Los tickets que salieron de este chat. */
  tickets: TicketSummary[];
  ticketHref: (ticketId: string) => string;
}

const citable = (m: MessageDto) => m.kind === 'text' || m.kind === 'auto_reply';

/**
 * «Abrir ticket» desde el chat (los dos lados): modo selección con casillas (por defecto, las últimas 2 h), el
 * formulario y «Agregar al ticket…» para llevar los mismos mensajes a uno ya abierto.
 */
export const useChatTicketing = ({ side, conversationId, tickets, ticketHref }: Options) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ReadonlySet<number> | null>(null);
  const [modal, setModal] = useState<'open' | 'add' | null>(null);
  const range = useMemo(() => (selected ? rangeOf(selected) : null), [selected]);
  const problem = selected ? rangeError(range) : null;
  const openTickets = tickets.filter((t) => t.status !== 'closed');

  /** Entra al modo selección con lo de las últimas 2 h (hasta `upTo`, si se pasa). */
  const start = (upTo?: MessageDto) => {
    if (!conversationId) return;
    const messages = queryClient.getQueryData<ThreadData>(chatKeys.thread(conversationId))?.messages ?? [];
    const limit = upTo ? new Date(upTo.createdAt).getTime() : Date.now();
    const since = limit - DEFAULT_SELECTION_MS;
    const recent = messages.filter((m) => {
      const at = new Date(m.createdAt).getTime();
      return citable(m) && at >= since && (!upTo || m.seq <= upTo.seq);
    });
    const fallback = messages.filter(citable).slice(-1);
    setSelected(new Set((recent.length ? recent : fallback).map((m) => m.seq)));
  };

  const toggle = (seq: number) =>
    setSelected((current) => {
      const next = new Set(current ?? []);
      if (next.has(seq)) next.delete(seq);
      else next.add(seq);
      return next;
    });

  const cancel = () => {
    setSelected(null);
    setModal(null);
  };

  const bar = selected && (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-outline bg-primary-soft px-3 py-2 text-sm"
      role="region"
      aria-label="Elegir mensajes para el ticket"
    >
      <span className="flex-1 text-ink">
        {problem ?? `${range?.size ?? 0} ${range?.size === 1 ? 'mensaje' : 'mensajes'} para el ticket`}
      </span>
      <Button size="sm" variant="ghost" onClick={cancel}>
        Cancelar
      </Button>
      {openTickets.length > 0 && (
        <Button size="sm" variant="secondary" disabled={Boolean(problem)} onClick={() => setModal('add')}>
          Agregar al ticket…
        </Button>
      )}
      <Button size="sm" disabled={Boolean(problem)} onClick={() => setModal('open')}>
        Abrir ticket
      </Button>
    </div>
  );

  const modals =
    conversationId && range ? (
      <>
        <OpenTicketModal
          open={modal === 'open'}
          onClose={() => setModal(null)}
          side={side}
          conversationId={conversationId}
          range={range}
          onCreated={(ticket) => {
            cancel();
            notify.success(`Ticket ${ticket.number} abierto`);
            navigate(ticketHref(ticket.id));
          }}
        />
        <AddExcerptModal
          open={modal === 'add'}
          onClose={() => setModal(null)}
          side={side}
          conversationId={conversationId}
          range={range}
          tickets={openTickets}
          onDone={(ticket) => {
            cancel();
            notify.success(`Mensajes agregados al ticket ${ticket.number}`);
          }}
        />
      </>
    ) : null;

  return {
    selecting: selected !== null,
    selection: selected ? { selected, toggle } : undefined,
    start,
    bar,
    modals,
  };
};
