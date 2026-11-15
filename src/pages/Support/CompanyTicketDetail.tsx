import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  DetailSkeleton,
  Skeleton,
  PageContainer,
  PageHeader,
} from '../../common/components/ui';
import { useSupportAccessPermissions } from '../../common/support/useSupportAccessActions';
import { ChatThread } from '../../features/chat/components/ChatThread';
import { ticketReadSeq } from '../../features/chat/ticketRead';
import { TicketTimeline } from '../../features/chat/components/TicketTimeline';
import { Fact, OriginBand, SessionStatusBadge, TicketHeaderBadges } from '../../features/chat/components/TicketParts';
import { companyChatHref, companyTicketHref, SUPPORT_PATH } from '../../features/chat/routes';
import type { Ticket } from '../../services/api/types';
import { useCompanyTicketThread } from '../../services/queries/chatSources';
import { chatKeys, useCompanyTicket } from '../../services/queries/supportChat';
import { usePlatform, useSupportAccess } from '../../services/queries/supportSessions';
import { formatDateTime } from '../../utils/format';
import { PendingRequestCard } from '../SupportAccess/components/PendingRequestCard';
import { ConfirmTicketCard } from './ConfirmTicketCard';

/** Un pedido de sesión de soporte con el número del ticket: si está pendiente, se aprueba o rechaza desde acá. */
const LinkedSession = ({ id, ticketId, canManage }: { id: string; ticketId: string; canManage: boolean }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const platformName = usePlatform().data?.name;
  const { data: session, error } = useSupportAccess(id);
  const status = session?.status;
  useEffect(() => {
    if (status) void queryClient.invalidateQueries({ queryKey: chatKeys.ticket('company', ticketId) });
  }, [status, ticketId, queryClient]);
  if (error) return <p className="text-sm text-danger">No se pudo cargar el pedido de sesión.</p>;
  if (!session) return <Skeleton className="h-16 w-full" />;
  if (session.status === 'pending') {
    return (
      <PendingRequestCard
        session={session}
        canManage={canManage}
        platformName={platformName}
        onOpen={() => navigate(`/support-access?session=${encodeURIComponent(session.id)}`)}
      />
    );
  }
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-ink-2">Pedida el {formatDateTime(session.createdAt)}</span>
      <SessionStatusBadge status={session.status} />
    </div>
  );
};

const ClosedNotice = () => (
  <p className="border-t border-outline bg-surface-sunken px-4 py-3 text-sm text-muted">
    El ticket está cerrado. Si el problema sigue,{' '}
    <Link to={`${SUPPORT_PATH}?tab=tickets`} className="font-medium text-primary underline">
      abrí uno nuevo
    </Link>
    .
  </p>
);

const ReadOnlyNotice = () => (
  <p className="border-t border-outline bg-surface-sunken px-4 py-3 text-sm text-muted">
    Podés leer el ticket, pero para responder hace falta el permiso «Gestionar soporte».
  </p>
);

/** Un ticket resuelto queda en sólo lectura; responder lo reabre (vuelve a «En curso»), así que se pide a propósito. */
const ResolvedNotice = ({ onReply, canManage }: { onReply: () => void; canManage: boolean }) => (
  <div className="flex flex-wrap items-center gap-2 border-t border-outline bg-surface-sunken px-4 py-3 text-sm text-muted">
    <span className="flex-1">El ticket está resuelto. Si el problema sigue, respondé y vuelve a quedar en curso.</span>
    {canManage && (
      <Button size="sm" variant="secondary" onClick={onReply}>
        Responder y reabrir
      </Button>
    )}
  </div>
);

const TicketBody = ({ ticket, canManage }: { ticket: Ticket; canManage: boolean }) => {
  const platformName = usePlatform().data?.name ?? 'el soporte';
  const binding = useCompanyTicketThread(ticket.id, ticket.conversationId);
  const closed = ticket.status === 'closed';
  const resolved = ticket.status === 'resolved';
  const [reopening, setReopening] = useState(false);
  const writable = canManage && !closed && (!resolved || reopening);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="flex h-[calc(100dvh-280px)] min-h-[440px] flex-col overflow-hidden p-0">
        <ChatThread
          side="company"
          source={binding.source}
          read={binding.read}
          counterpartLastReadSeq={ticketReadSeq(ticket)}
          counterpartName={platformName}
          ctx={{ platformName, ticketHref: companyTicketHref }}
          canWrite={writable}
          readOnlyNotice={
            closed ? (
              <ClosedNotice />
            ) : resolved ? (
              <ResolvedNotice canManage={canManage} onReply={() => setReopening(true)} />
            ) : (
              <ReadOnlyNotice />
            )
          }
          empty={<p className="px-4 py-10 text-center text-sm text-muted">Todavía no hay mensajes.</p>}
        />
      </Card>
      <div className="grid content-start gap-4">
        {ticket.status === 'resolved' && <ConfirmTicketCard ticket={ticket} canManage={canManage} />}
        <Card>
          <CardHeader title="Datos" as="h2" />
          <dl className="grid gap-3">
            <Fact label="Número">{ticket.number}</Fact>
            <Fact label="Atiende">{ticket.attendedBy?.displayName ?? `Todavía nadie de ${platformName}`}</Fact>
            <Fact label="Creado">{formatDateTime(ticket.createdAt)}</Fact>
            <Fact label="Primera respuesta">
              {ticket.firstResponseAt ? formatDateTime(ticket.firstResponseAt) : 'Todavía no'}
            </Fact>
            {ticket.resolvedAt && <Fact label="Resuelto">{formatDateTime(ticket.resolvedAt)}</Fact>}
            {ticket.closedAt && <Fact label="Cerrado">{formatDateTime(ticket.closedAt)}</Fact>}
            {ticket.satisfaction !== null && <Fact label="Tu calificación">{`${ticket.satisfaction} de 5`}</Fact>}
          </dl>
        </Card>
        <TicketTimeline side="company" ticket={ticket} />
        {ticket.supportSessions.length > 0 && (
          <Card>
            <CardHeader title="Sesiones de soporte" subtitle="Pedidas con el número de este ticket" as="h2" />
            <div className="grid gap-3">
              {ticket.supportSessions.map((s) => (
                <LinkedSession key={s.id} id={s.id} ticketId={ticket.id} canManage={canManage} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

/** La ficha de un ticket, del lado de la empresa: su hilo propio, el estado y lo que se hace desde acá. */
export const CompanyTicketDetail = () => {
  const { id } = useParams();
  const { canManage } = useSupportAccessPermissions();
  const { data: ticket, error, refetch } = useCompanyTicket(id);
  if (error) {
    return (
      <PageContainer>
        <ErrorState
          error={error}
          resource="El ticket"
          notFoundDescription="El ticket no existe o no es de tu empresa."
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
  return (
    <PageContainer size="xl" stack>
      <PageHeader
        eyebrow={`Ticket ${ticket.number}`}
        title={ticket.subject}
        badges={<TicketHeaderBadges ticket={ticket} />}
      />
      <OriginBand ticket={ticket} chatHref={companyChatHref} />
      <TicketBody ticket={ticket} canManage={canManage} />
    </PageContainer>
  );
};
