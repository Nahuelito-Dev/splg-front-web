import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { Badge, Card } from '../../../../common/components/ui';
import { useOrderIncidents } from '../../../../services/queries/orders';
import { errorMessage } from '../../../../services/api/errors';
import { formatDateTime } from '../../../../utils/format';
import { INCIDENT_STATUS, INCIDENT_TYPE, labelOf } from '../../../../utils/statusLabels';

/** Incidencias que un chofer reportó durante el reparto de este pedido (GET /incidents/order/:id). */
export const OrderIncidents = ({ orderId }: { orderId: string }) => {
  const { data: incidents, isError, error, refetch } = useOrderIncidents(orderId);

  if (isError) {
    return (
      <Card className="p-4">
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar las incidencias del pedido: {errorMessage(error)}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Reintentar
          </button>
        </p>
      </Card>
    );
  }

  if (!incidents || incidents.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <ReportProblemOutlinedIcon fontSize="small" /> Incidencias reportadas
      </h3>
      <ul className="space-y-3">
        {incidents.map((incident) => (
          <li
            key={incident.incident_id}
            className="flex items-start justify-between gap-3 border-b border-outline pb-3 last:border-0 last:pb-0"
          >
            <div>
              <p className="text-sm text-ink">{incident.description}</p>
              <p className="text-xs text-muted">{formatDateTime(incident.createdAt)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge label={labelOf(INCIDENT_TYPE, incident.type)} />
              <Badge label={labelOf(INCIDENT_STATUS, incident.status)} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
};
