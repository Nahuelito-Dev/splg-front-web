import { History } from 'lucide-react';
import { Button, Card, CardHeader, Skeleton } from '../../../common/components/ui';
import type { Ticket } from '../../../services/api/types';
import { useTicketHistory, type ChatSide } from '../../../services/queries/supportChat';
import { errorMessage } from '../../../services/api/errors';
import { formatDateTime } from '../../../utils/format';
import { buildTimeline } from '../timeline';

/** La vida del ticket: creado, primera respuesta y cada cambio de estado, con fecha y hora argentinas. */
export const TicketTimeline = ({ side, ticket }: { side: ChatSide; ticket: Ticket }) => {
  const history = useTicketHistory(side, ticket.id);
  return (
    <Card>
      <CardHeader title="Historial" icon={<History className="h-4 w-4" />} as="h2" />
      {history.error ? (
        <div role="alert" className="grid gap-2 text-sm text-danger">
          No se pudo cargar el historial: {errorMessage(history.error)}
          <Button size="sm" variant="secondary" onClick={() => void history.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : !history.data ? (
        <div className="grid gap-2" aria-label="Cargando el historial">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <ol aria-label="Línea de tiempo del ticket" className="grid gap-3 border-l border-outline pl-4">
          {buildTimeline(ticket, history.data).map((entry) => (
            <li key={entry.key} className="relative">
              <span aria-hidden="true" className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm text-ink">{entry.text}</p>
              <time dateTime={entry.at} className="text-xs text-muted">
                {formatDateTime(entry.at)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
};
