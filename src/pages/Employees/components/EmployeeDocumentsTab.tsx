import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { Card, EmptyState, ErrorState, LoadingState } from '../../../common/components/ui';
import { AttachmentsPanel } from '../../../common/components/AttachmentsPanel';
import type { Employee, FleetPlan, FleetTask } from '../../../services/api/types';
import { useEmployeeDocuments } from '../../../services/queries/personnel';
import { isEmployeePlan } from '../documentDetails';
import { EmployeeDocumentCard } from './EmployeeDocumentCard';
import { EmployeeDocumentFormModal } from './EmployeeDocumentFormModal';

interface Props {
  employee: Employee;
  canWrite: boolean;
  blockedReason?: string;
}

interface CardEntry {
  plan: FleetPlan;
  /** La tarea abierta que vence primero; `null` si falta cargarla. */
  task: FleetTask | null;
}

const isOpen = (task: FleetTask) => task.status !== 'done' && task.status !== 'cancelled';

/**
 * La pestaña «Documentación» del legajo (CU-183 a CU-185, CU-187): una tarjeta por documento que le aplica
 * —vigente, por vencer, vencida o faltante— con su alta y su renovación, la marca de si está inhabilitado y, más
 * abajo, los archivos del legajo (DNI, contrato…).
 */
export const EmployeeDocumentsTab = ({ employee, canWrite, blockedReason }: Props) => {
  const { data, isPending, error, refetch } = useEmployeeDocuments(employee.employeeId);
  const [loading, setLoading] = useState<CardEntry | null>(null);

  const entries = useMemo<CardEntry[]>(() => {
    if (!data) return [];
    const byPlan = new Map<string, CardEntry>();
    for (const task of data.tasks.filter(isOpen)) {
      if (!task.plan) continue;
      const current = byPlan.get(task.planId);
      // Una tarea por plan: la que vence primero (la API las ordena por vencimiento).
      if (!current?.task) byPlan.set(task.planId, { plan: task.plan, task });
    }
    for (const plan of data.missingPlans) byPlan.set(plan.planId, { plan, task: null });
    return [...byPlan.values()].sort((a, b) => a.plan.name.localeCompare(b.plan.name, 'es'));
  }, [data]);

  return (
    <div className="space-y-6">
      {isPending ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState error={error} resource="La documentación" onRetry={() => void refetch()} />
      ) : (
        <>
          {data.isLocked && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
            >
              <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>No recibe pedidos hasta que se resuelva: {data.lockReasons.join('; ')}.</span>
            </p>
          )}
          {entries.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                title="Sin documentación"
                description="Los planes de documentación de la distribuidora no le aplican a este puesto."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {entries.map((entry) => (
                <EmployeeDocumentCard
                  key={entry.plan.planId}
                  plan={entry.plan}
                  task={entry.task}
                  canWrite={canWrite}
                  blockedReason={blockedReason}
                  loadable={isEmployeePlan(entry.plan) && employee.status === 'active'}
                  deliveryId={employee.deliveryId}
                  onLoad={() => setLoading(entry)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Card className="p-6">
        <AttachmentsPanel
          ownerType="employee"
          ownerId={employee.employeeId}
          canWrite={canWrite}
          blockedReason={blockedReason}
          title="Archivos del legajo"
          hint="DNI, contrato, certificados…"
        />
      </Card>

      {loading && (
        <EmployeeDocumentFormModal
          open
          onClose={() => setLoading(null)}
          employeeId={employee.employeeId}
          plan={loading.plan}
          previous={loading.task}
        />
      )}
    </div>
  );
};
