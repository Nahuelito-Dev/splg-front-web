import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge, Button, DetailList, RecordDrawer } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import type { PlanningCaseDetail } from '../../../services/api/types';
import { useCancelPlanningCase, usePlanningCase, useReplanTask } from '../../../services/queries/planner';
import { formatDateTime, formatDay } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { FLEET_TASK_CRITICALITY, labelOf } from '../../../utils/statusLabels';
import {
  PLANNING_CASE_STATUS,
  WINDOW_PROPOSAL_STATUS,
  WINDOW_SOURCE,
  formatWindow,
  isOpenCase,
  windowOutcome,
} from './plannerLabels';
import { WindowFormModal } from './WindowFormModal';

interface Props {
  caseId: string | null;
  onClose: () => void;
}

const Proposals = ({ planningCase }: { planningCase: PlanningCaseDetail }) =>
  planningCase.proposals.length === 0 ? (
    <p className="text-sm text-muted">
      {planningCase.driverName
        ? 'Todavía no se le ofreció ninguna ventana al chofer.'
        : 'No se negoció con ningún chofer: el vehículo no tenía uno asignado.'}
    </p>
  ) : (
    <ol className="space-y-2">
      {planningCase.proposals.map((p) => (
        <li key={p.proposalId} className="rounded-xl border border-outline p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">
              {p.rank}.ª alternativa · {formatWindow(p.windowStart, p.windowEnd)}
            </span>
            <Badge label={WINDOW_PROPOSAL_STATUS[p.status]} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {p.status === 'pending' ? `Vence el ${formatDateTime(p.expiresAt)}` : null}
            {p.respondedAt ? `Respondió el ${formatDateTime(p.respondedAt)}` : null}
            {p.status === 'expired' ? `Venció el ${formatDateTime(p.expiresAt)} sin respuesta` : null}
          </p>
          {p.rejectionReason && <p className="mt-1 text-sm text-ink-2">Motivo: {p.rejectionReason}</p>}
          {p.altWindowStart && (
            <p className="mt-1 text-sm text-ink-2">Propone: {formatWindow(p.altWindowStart, p.altWindowEnd)}</p>
          )}
        </li>
      ))}
    </ol>
  );

const Windows = ({ planningCase }: { planningCase: PlanningCaseDetail }) =>
  planningCase.windows.length === 0 ? (
    <p className="text-sm text-muted">Este caso se abrió sin evaluar ventanas (la fijó el administrador).</p>
  ) : (
    <ul className="space-y-1.5">
      {planningCase.windows.map((w) => (
        <li key={w.start} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <span className="flex flex-wrap items-center gap-2 text-ink">
            {formatWindow(w.start, w.end)}
            {w.urgent && <Badge label={{ text: 'Urgente', tone: 'danger' }} />}
          </span>
          <span className="text-xs text-muted">
            {w.demand} pedidos esperados{w.unitsLeft !== null ? ` · quedarían ${w.unitsLeft} unidades` : ''}
          </span>
          <Badge label={windowOutcome(w)} />
        </li>
      ))}
    </ul>
  );

/** El detalle de un caso del planificador: lo que se negoció, el cuadro de ventanas y las decisiones del administrador. */
export const PlanningCaseDrawer = ({ caseId, onClose }: Props) => {
  const { canWrite, writeHint } = usePermissions();
  const detail = usePlanningCase(caseId ?? undefined);
  const cancel = useCancelPlanningCase();
  const replan = useReplanTask();
  const [deciding, setDeciding] = useState(false);
  const planningCase = detail.data;
  const open = planningCase ? isOpenCase(planningCase.status) : false;

  const handleCancel = async () => {
    if (!planningCase) return;
    const ok = await confirm({
      title: '¿Cancelar el caso?',
      text: 'No se programa nada y se cancela la propuesta que esperaba al chofer. El planificador puede abrir otro en la próxima corrida si la tarea sigue dentro de su anticipación.',
      confirmText: 'Cancelar caso',
      danger: true,
    });
    if (!ok) return;
    cancel.mutate(
      { id: planningCase.caseId, body: {} },
      { onSuccess: () => notify.success('Caso cancelado'), onError: notify.error },
    );
  };

  const handleReplan = async () => {
    if (!planningCase) return;
    const ok = await confirm({
      title: '¿Re-planificar la tarea?',
      text: 'Se descarta el caso y la propuesta vigente, y se planifica de nuevo con los datos de hoy: se le ofrece la mejor ventana al chofer.',
      confirmText: 'Re-planificar',
    });
    if (!ok) return;
    replan.mutate(planningCase.taskId, {
      onSuccess: () => notify.success('Tarea re-planificada'),
      onError: notify.error,
    });
  };

  return (
    <>
      <RecordDrawer
        open={caseId !== null}
        onClose={onClose}
        size="lg"
        title={planningCase?.taskName ?? 'Caso de planificación'}
        description={planningCase?.patent ?? undefined}
        badges={planningCase && <Badge label={PLANNING_CASE_STATUS[planningCase.status]} />}
        loading={detail.isPending && caseId !== null}
        error={detail.error}
        onRetry={() => void detail.refetch()}
        resource="El caso"
        footer={
          planningCase && open ? (
            <>
              <Button icon={<CheckCircle2 />} disabled={!canWrite} title={writeHint} onClick={() => setDeciding(true)}>
                {planningCase.status === 'awaiting_confirmation' ? 'Confirmar taller' : 'Elegir ventana'}
              </Button>
              <Button
                variant="secondary"
                icon={<RefreshCw />}
                disabled={!canWrite || replan.isPending}
                title={writeHint}
                onClick={() => void handleReplan()}
              >
                Re-planificar
              </Button>
              <Button
                variant="ghost"
                icon={<Ban />}
                disabled={!canWrite || cancel.isPending}
                title={writeHint}
                onClick={() => void handleCancel()}
              >
                Cancelar caso
              </Button>
            </>
          ) : undefined
        }
      >
        {planningCase && (
          <div className="space-y-6">
            {planningCase.status === 'escalated' && (
              <p role="status" className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
                Resolvelo vos: {planningCase.escalationText}.
              </p>
            )}
            {planningCase.status === 'awaiting_confirmation' && (
              <p role="status" className="rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
                {planningCase.chosenSource === 'driver_alternative'
                  ? 'El chofer propuso otra ventana.'
                  : 'El chofer aceptó la ventana.'}{' '}
                Falta que confirmes el taller y el gasto.
              </p>
            )}
            {planningCase.status === 'confirmed' && (
              <p className="rounded-xl border border-success/30 bg-success-soft p-3 text-sm text-success">
                Taller programado. El gasto se registra al cerrar la tarea.{' '}
                <Link className="font-semibold underline" to={`/fleet/tasks/${planningCase.taskId}`}>
                  Ir a la tarea
                </Link>
              </p>
            )}
            <DetailList
              items={[
                { label: 'Vehículo', value: planningCase.patent ?? '—', mono: true },
                { label: 'Chofer', value: planningCase.driverName ?? 'Sin chofer asignado' },
                { label: 'Documento', value: labelOf(FLEET_TASK_CRITICALITY, planningCase.criticality).text },
                { label: 'Vence (proyectado)', value: formatDay(planningCase.projectedDueAt) },
                { label: 'Caso abierto', value: formatDateTime(planningCase.openedAt) },
                {
                  label: 'Ventana de taller',
                  value: planningCase.chosenStart
                    ? `${formatWindow(planningCase.chosenStart, planningCase.chosenEnd)}${
                        planningCase.chosenSource ? ` · ${WINDOW_SOURCE[planningCase.chosenSource]}` : ''
                      }`
                    : 'Sin acordar',
                  wide: true,
                },
                ...(planningCase.notes ? [{ label: 'Notas', value: planningCase.notes, wide: true }] : []),
              ]}
            />
            <section aria-labelledby="planner-proposals">
              <h3 id="planner-proposals" className="mb-2 text-sm font-semibold text-ink">
                Ventanas ofrecidas al chofer
              </h3>
              <Proposals planningCase={planningCase} />
            </section>
            <section aria-labelledby="planner-windows">
              <h3 id="planner-windows" className="mb-2 text-sm font-semibold text-ink">
                Ventanas evaluadas
              </h3>
              <Windows planningCase={planningCase} />
            </section>
          </div>
        )}
      </RecordDrawer>
      {deciding && planningCase && (
        <WindowFormModal mode="confirm" planningCase={planningCase} onClose={() => setDeciding(false)} />
      )}
    </>
  );
};
