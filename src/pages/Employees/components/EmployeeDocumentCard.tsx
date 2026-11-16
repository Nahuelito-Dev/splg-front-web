import { CirclePlus, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardHeader } from '../../../common/components/ui';
import type { FleetPlan, FleetTask } from '../../../services/api/types';
import { formatDay } from '../../../utils/format';
import { FLEET_EXPIRATION_STATUS, FLEET_TASK_CRITICALITY, labelOf } from '../../../utils/statusLabels';
import { detailFieldsOf } from '../documentDetails';

interface Props {
  plan: FleetPlan;
  /** La tarea abierta de este plan (la que vence primero), o `null` si no tiene ninguna cargada. */
  task: FleetTask | null;
  canWrite: boolean;
  blockedReason?: string;
  /** Se carga desde la ficha del empleado; la licencia del chofer cuelga de su perfil de reparto. */
  loadable: boolean;
  deliveryId: string | null;
  onLoad: () => void;
}

/** «Vence en 12 días» / «Venció hace 3 días» a partir del estado que calculó la API. */
const dueText = (task: FleetTask): string | null => {
  if (task.daysUntilDue === null) return null;
  const days = Math.abs(task.daysUntilDue);
  const plural = days === 1 ? 'día' : 'días';
  if (task.expirationStatus === 'expired') return days === 0 ? 'Venció hoy' : `Venció hace ${days} ${plural}`;
  return days === 0 ? 'Vence hoy' : `Vence en ${days} ${plural}`;
};

/**
 * La tarjeta de un documento del empleado: vigente, por vencer, vencido o faltante (CU-187). Lo que falta se carga
 * desde acá; lo cargado se renueva o se abre en su ficha de tarea (adjuntos, edición, cierre).
 */
export const EmployeeDocumentCard = ({ plan, task, canWrite, blockedReason, loadable, deliveryId, onLoad }: Props) => {
  const details = task?.details ?? null;
  const fields = detailFieldsOf(plan.documentKind);
  const expired = task?.expirationStatus === 'expired';

  return (
    <Card className={expired ? 'border-danger/40 p-4' : 'p-4'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardHeader title={plan.name} as="h3" className="" />
          <p className="mt-0.5 text-xs text-muted">{labelOf(FLEET_TASK_CRITICALITY, plan.criticality).text}</p>
        </div>
        {task?.expirationStatus ? (
          <Badge label={labelOf(FLEET_EXPIRATION_STATUS, task.expirationStatus)} variant="critical" />
        ) : (
          <Badge label={{ text: 'Falta cargar', tone: 'neutral' }} />
        )}
      </div>

      {task ? (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-ink">
            Vence el <b>{formatDay(task.dueAt)}</b>
            {dueText(task) && <span className="ml-2 text-xs text-muted">{dueText(task)}</span>}
          </p>
          {details &&
            fields.map((field) => (
              <p key={field.key} className="text-xs text-muted">
                {field.label}:{' '}
                <span className="text-ink">
                  {field.type === 'date' ? formatDay(details[field.key]) : details[field.key]}
                </span>
              </p>
            ))}
          {task.referenceNumber && <p className="text-xs text-muted">Referencia: {task.referenceNumber}</p>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {plan.criticality === 'blocking'
            ? 'Sin este documento cargado, el chofer queda inhabilitado para el despacho.'
            : 'Todavía no tiene este documento cargado.'}
        </p>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {task && (
          <Link
            to={`/fleet/tasks/${task.taskId}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-strong hover:bg-primary-soft"
          >
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            Ver tarea y adjuntos
          </Link>
        )}
        {loadable ? (
          <Button
            size="sm"
            variant={task ? 'secondary' : 'primary'}
            icon={task ? <RefreshCw /> : <CirclePlus />}
            blockedReason={blockedReason}
            onClick={() => canWrite && onLoad()}
          >
            {task ? 'Renovar' : 'Cargar'}
          </Button>
        ) : (
          !task &&
          deliveryId && (
            <Link
              to={`/deliveries/details/${deliveryId}`}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-strong hover:bg-primary-soft"
            >
              Se carga en la ficha del chofer
            </Link>
          )
        )}
      </div>
    </Card>
  );
};
