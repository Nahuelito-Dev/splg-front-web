import { useQueryClient } from '@tanstack/react-query';
import { LifeBuoy } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardHeader,
  DetailSkeleton,
  ErrorState,
  PageContainer,
  PageHeader,
} from '../../../common/components/ui';
import { RequestSupportModal } from '../../../common/support/RequestSupportModal';
import { useAppSelector } from '../../../hooks/reduxHooks';
import { ChatThread } from '../../../features/chat/components/ChatThread';
import {
  Fact,
  FirstResponseDue,
  OriginBand,
  SessionStatusBadge,
  TicketHeaderBadges,
} from '../../../features/chat/components/TicketParts';
import { ticketReadSeq } from '../../../features/chat/ticketRead';
import { TicketTimeline } from '../../../features/chat/components/TicketTimeline';
import { platformChatHref, platformTicketHref } from '../../../features/chat/routes';
import type { Ticket } from '../../../services/api/types';
import { usePlatformTicketThread } from '../../../services/queries/chatSources';
import { chatKeys, usePlatformTicket, useQuickReplies } from '../../../services/queries/supportChat';
import { usePlatform } from '../../../services/queries/supportSessions';
import { useMyAccount } from '../../../services/queries/users';
import { formatDateTime } from '../../../utils/format';
import { TicketManageCard } from './TicketManageCard';

const notice = (text: string) => (
  <p className="border-t border-outline bg-surface-sunken px-4 py-3 text-sm text-muted">{text}</p>
);

const SessionsCard = ({ ticket }: { ticket: Ticket }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader
        title="Sesiones de soporte"
        subtitle="Pedidas con el número de este ticket"
        as="h2"
        action={
          ticket.status !== 'closed' ? (
            <Button size="sm" variant="secondary" icon={<LifeBuoy />} onClick={() => setOpen(true)}>
              Pedir sesión
            </Button>
          ) : undefined
        }
      />
      {ticket.supportSessions.length === 0 ? (
        <p className="text-sm text-muted">Ninguna todavía.</p>
      ) : (
        <ul className="grid gap-2">
          {ticket.supportSessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <Link
                to={`/platform/support-sessions?session=${encodeURIComponent(s.id)}`}
                className="text-primary underline"
              >
                Ver la sesión
              </Link>
              <SessionStatusBadge status={s.status} />
            </li>
          ))}
        </ul>
      )}
      <RequestSupportModal
        open={open}
        onClose={() => {
          setOpen(false);
          void queryClient.invalidateQueries({ queryKey: chatKeys.ticket('platform', ticket.id) });
        }}
        distributorId={ticket.distributorId}
        ticketRef={ticket.number}
        reason={`Por el ticket ${ticket.number}: ${ticket.subject}`}
      />
    </Card>
  );
};

/**
 * La ficha de un ticket del lado de la plataforma (§15.1): hilo propio con «Responder / Nota interna» y respuestas
 * rápidas, gestión (asignar, prioridad, estado), sesiones de soporte con `ticketRef` y la línea de tiempo. Resuelto o
 * cerrado, el hilo queda de sólo lectura (con las notas internas a la vista).
 */
export const PlatformTicketDetail = () => {
  const { id = '' } = useParams();
  const email = useAppSelector((state) => state.auth.email);
  const me = useMyAccount(email).data?.user_id;
  const platformName = usePlatform().data?.name ?? 'Soporte';
  const { data: ticket, error, refetch } = usePlatformTicket(id);
  const quickReplies = useQuickReplies(true);
  const binding = usePlatformTicketThread(id, ticket?.conversationId ?? '');

  if (error) {
    return (
      <PageContainer>
        <ErrorState
          error={error}
          resource="El ticket"
          notFoundDescription="El ticket no existe."
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }
  if (!ticket) {
    return (
      <PageContainer>
        <DetailSkeleton />
      </PageContainer>
    );
  }
  const readOnly = ticket.status === 'resolved' || ticket.status === 'closed';
  return (
    <PageContainer size="xl" stack>
      <PageHeader
        eyebrow={`Ticket ${ticket.number} · ${ticket.distributorName}`}
        title={ticket.subject}
        badges={<TicketHeaderBadges ticket={ticket} />}
      />
      <OriginBand ticket={ticket} chatHref={platformChatHref} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex h-[calc(100dvh-280px)] min-h-[440px] flex-col overflow-hidden p-0">
          <ChatThread
            side="platform"
            source={binding.source}
            read={binding.read}
            counterpartLastReadSeq={ticketReadSeq(ticket)}
            counterpartName={ticket.distributorName}
            ctx={{ platformName, ticketHref: platformTicketHref }}
            canWrite={!readOnly}
            readOnlyNotice={notice(
              ticket.status === 'closed'
                ? 'El ticket está cerrado: queda para consultar.'
                : 'El ticket está resuelto. Para seguir, reabrilo desde «Gestión».',
            )}
            allowInternal
            quickReplies={quickReplies.data?.items}
            empty={<p className="px-4 py-10 text-center text-sm text-muted">Todavía no hay mensajes.</p>}
          />
        </Card>
        <div className="grid content-start gap-4">
          {ticket.status !== 'closed' && <TicketManageCard ticket={ticket} myUserId={me} />}
          <Card>
            <CardHeader title="Datos" as="h2" />
            <dl className="grid gap-3">
              <Fact label="Empresa">
                <Link
                  to={`/distributors/${encodeURIComponent(ticket.distributorId)}`}
                  className="text-primary underline"
                >
                  {ticket.distributorName}
                </Link>
              </Fact>
              <Fact label="Creado">{formatDateTime(ticket.createdAt)}</Fact>
              <Fact label="Primera respuesta">
                <FirstResponseDue ticket={ticket} />
              </Fact>
              {ticket.resolvedAt && <Fact label="Resuelto">{formatDateTime(ticket.resolvedAt)}</Fact>}
              {ticket.closedAt && <Fact label="Cerrado">{formatDateTime(ticket.closedAt)}</Fact>}
              <Fact label="Atendido por">{ticket.assignedTo?.fullName ?? 'Nadie todavía'}</Fact>
              {ticket.satisfaction !== null && <Fact label="Calificación">{`${ticket.satisfaction} de 5`}</Fact>}
            </dl>
          </Card>
          <SessionsCard ticket={ticket} />
          <TicketTimeline side="platform" ticket={ticket} />
        </div>
      </div>
    </PageContainer>
  );
};
