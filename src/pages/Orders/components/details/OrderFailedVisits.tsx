import { CalendarClock } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, CardHeader } from '../../../../common/components/ui';
import { usePermissions } from '../../../../hooks';
import { errorMessage } from '../../../../services/api/errors';
import type { Order } from '../../../../services/api/types';
import { useOrderFailedVisits } from '../../../../services/queries/failedVisits';
import { REVISIT_STATUS, labelOf } from '../../../../utils/statusLabels';
import { FailedVisitHistory } from '../../../FailedVisits/components/FailedVisitHistory';
import { ScheduleRevisitModal } from '../../../FailedVisits/components/ScheduleRevisitModal';
import { revisitWhen } from '../../../FailedVisits/revisit';

/**
 * Las visitas en que no se pudo entregar el pedido (punto, distancia y motivo de cada una) y su nueva visita. Con el
 * pedido pendiente y sin chofer, el admin fija acá el día y la franja; reasignar y cancelar están en la barra de la
 * ficha. Un pedido sin visitas fallidas no muestra nada.
 */
export const OrderFailedVisits = ({ order }: { order: Order }) => {
  const { canOperate, operateHint } = usePermissions();
  const { data: visits, isError, error, refetch } = useOrderFailedVisits(order.order_id);
  const [scheduling, setScheduling] = useState(false);

  if (isError) {
    return (
      <Card className="p-4">
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar las visitas fallidas del pedido: {errorMessage(error)}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Reintentar
          </button>
        </p>
      </Card>
    );
  }
  if (!visits || visits.length === 0) return null;

  const revisit = order.revisit;
  const canSchedule = Boolean(revisit) && order.status === 'pending' && !order.delivery_id;
  const when = revisit ? revisitWhen(revisit) : null;

  return (
    <Card className="p-4">
      <CardHeader
        title="Visitas fallidas"
        subtitle={`${visits.length} ${visits.length === 1 ? 'intento' : 'intentos'} de entrega sin éxito`}
        icon={<CalendarClock />}
        as="h3"
        className="mb-3"
        action={
          canSchedule ? (
            <Button
              variant="secondary"
              onClick={() => setScheduling(true)}
              blockedReason={canOperate ? undefined : operateHint}
            >
              Fijar día y franja
            </Button>
          ) : undefined
        }
      />
      {revisit && (
        <p className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface-hover p-2 text-sm text-ink">
          <span className="font-semibold">Nueva visita:</span>
          <Badge label={labelOf(REVISIT_STATUS, revisit.status)} />
          {when ?? 'Sin fecha: fijala, reasigná el pedido o cancelalo'}
        </p>
      )}
      <FailedVisitHistory visits={visits} />
      <ScheduleRevisitModal orderId={scheduling ? order.order_id : null} onClose={() => setScheduling(false)} />
    </Card>
  );
};
