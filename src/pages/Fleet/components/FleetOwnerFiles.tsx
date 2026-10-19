import { Lock } from 'lucide-react';
import { Card, EmptyState, ErrorState, ListSkeleton } from '../../../common/components/ui';
import { AttachmentsPanel } from '../../../common/components/AttachmentsPanel';
import { useCarDocuments } from '../../../services/queries/fleet';
import { useEmployeeDocuments } from '../../../services/queries/personnel';
import { documentsToReview } from '../documentRules';
import { FleetDocumentFiles } from './FleetDocumentFiles';

export type FilesSubject = 'vehicle' | 'employee';

interface Props {
  subject: FilesSubject;
  ownerId: string;
  /** Cómo se llama el vehículo o el empleado, para los títulos. */
  ownerName: string;
  canWrite: boolean;
  blockedReason?: string;
}

/** Los archivos de un vehículo o legajo: sus documentos con vencimiento, cada uno con sus adjuntos. */
export const FleetOwnerFiles = ({ subject, ownerId, ownerName, canWrite, blockedReason }: Props) => {
  // Las dos consultas se declaran siempre (reglas de los hooks); sólo una queda habilitada.
  const car = useCarDocuments(subject === 'vehicle' ? ownerId : undefined);
  const employee = useEmployeeDocuments(subject === 'employee' ? ownerId : undefined);
  const { data, isPending, error, refetch } = subject === 'vehicle' ? car : employee;

  if (isPending) return <ListSkeleton rows={4} columns={3} />;
  if (error || !data) return <ErrorState error={error} resource="La documentación" onRetry={() => void refetch()} />;

  const documents = documentsToReview(data.tasks);
  const lockReasons = 'lockReasons' in data ? data.lockReasons : [];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-ink">{ownerName}</h2>
      {data.isLocked && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
        >
          <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {subject === 'vehicle' ? 'No puede salir a operar' : 'No recibe pedidos'} hasta que se resuelva
            {lockReasons.length > 0 ? `: ${lockReasons.join('; ')}` : ' su documentación vencida'}.
          </span>
        </p>
      )}
      {documents.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="Sin documentación cargada"
            description="Cuando se cargue una tarea de documentación, sus archivos aparecen acá."
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {documents.map((task, index) => (
            <li key={task.taskId}>
              <FleetDocumentFiles task={task} canWrite={canWrite} defaultOpen={index === 0} />
            </li>
          ))}
        </ul>
      )}
      {subject === 'employee' && (
        <Card className="p-5">
          <AttachmentsPanel
            ownerType="employee"
            ownerId={ownerId}
            canWrite={canWrite}
            blockedReason={blockedReason}
            title="Archivos del legajo"
            hint="DNI, contrato, certificados…"
          />
        </Card>
      )}
    </div>
  );
};
