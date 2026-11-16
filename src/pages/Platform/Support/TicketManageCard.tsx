import { Button, Card, CardHeader, Select } from '../../../common/components/ui';
import type { TicketCategory, TicketPriority, TicketStatus } from '../../../services/api/supportChat';
import type { Ticket } from '../../../services/api/types';
import { useUpdatePlatformTicket, type TicketChange } from '../../../services/queries/supportChat';
import { notify } from '../../../utils/notifications';
import { statusOptions, TICKET_CATEGORY, TICKET_PRIORITY } from '../../../utils/statusLabels';

/**
 * Lo que la plataforma puede hacer a mano con el estado (§4.2.2). Cerrar no: lo cierra la empresa al confirmar o el
 * cierre automático a los 7 días (la API responde `TICKET_INVALID_TRANSITION` si se intenta).
 */
const NEXT_STATUS: Record<TicketStatus, TicketStatus[]> = {
  new: ['open', 'waiting_company'],
  open: ['waiting_company', 'resolved'],
  waiting_company: ['open', 'resolved'],
  resolved: ['open'],
  closed: [],
};

const ACTION_LABEL = (from: TicketStatus, to: TicketStatus): string =>
  to === 'open'
    ? from === 'resolved'
      ? 'Reabrir'
      : 'Pasar a en curso'
    : to === 'waiting_company'
      ? 'Esperar a la empresa'
      : 'Resolver';

const isPriority = (value: string): value is TicketPriority => value in TICKET_PRIORITY;
const isCategory = (value: string): value is TicketCategory => value in TICKET_CATEGORY;

/** Asignar, prioridad, categoría y estado de un ticket (plataforma). Una transición inválida la explica la API. */
export const TicketManageCard = ({ ticket, myUserId }: { ticket: Ticket; myUserId: string | undefined }) => {
  const update = useUpdatePlatformTicket();
  const mine = Boolean(myUserId) && ticket.assignedTo?.userId === myUserId;

  const patch = (body: TicketChange, done: string) =>
    update.mutate({ id: ticket.id, body }, { onSuccess: () => notify.success(done), onError: notify.error });

  const move = (to: TicketStatus) => patch({ status: to }, `${ACTION_LABEL(ticket.status, to)}: listo`);

  return (
    <Card>
      <CardHeader title="Gestión" as="h2" />
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-ink-2">
            {ticket.assignedTo ? `Asignado a ${mine ? 'vos' : ticket.assignedTo.fullName}` : 'Sin asignar'}
          </span>
          {mine ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={update.isPending}
              onClick={() => patch({ assignedTo: null }, 'Ticket desasignado')}
            >
              Desasignar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={!myUserId || update.isPending}
              onClick={() => myUserId && patch({ assignedTo: myUserId }, 'Ticket asignado a vos')}
            >
              Asignármelo
            </Button>
          )}
        </div>
        <Select
          label="Prioridad"
          value={ticket.priority}
          disabled={update.isPending}
          onChange={(event) =>
            isPriority(event.target.value) && patch({ priority: event.target.value }, 'Prioridad cambiada')
          }
          options={statusOptions(TICKET_PRIORITY)}
        />
        <Select
          label="Categoría"
          value={ticket.category}
          disabled={update.isPending}
          onChange={(event) =>
            isCategory(event.target.value) && patch({ category: event.target.value }, 'Categoría cambiada')
          }
          options={statusOptions(TICKET_CATEGORY)}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Cambiar el estado">
          {NEXT_STATUS[ticket.status].map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === 'resolved' ? 'primary' : 'secondary'}
              loading={update.isPending && update.variables?.body.status === to}
              disabled={update.isPending}
              onClick={() => move(to)}
            >
              {ACTION_LABEL(ticket.status, to)}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};
