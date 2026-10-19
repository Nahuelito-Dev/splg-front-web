import { useId, useState } from 'react';
import { ChevronDown, FileText, Paperclip } from 'lucide-react';
import { Badge, Card, cx } from '../../../common/components/ui';
import type { FleetTask } from '../../../services/api/types';
import { formatDay } from '../../../utils/format';
import { FLEET_EXPIRATION_STATUS, FLEET_TASK_STATUS, labelOf } from '../../../utils/statusLabels';
import { documentDueText } from '../documentRules';
import { FleetTaskAttachments } from './FleetTaskAttachments';

interface Props {
  task: FleetTask;
  canWrite: boolean;
  /** Abre los archivos de entrada (el primer documento a atender). */
  defaultOpen?: boolean;
}

/** Un documento (tarea) del vehículo o legajo con su vencimiento; al desplegarlo se ven, suben y descargan sus archivos. */
export const FleetDocumentFiles = ({ task, canWrite, defaultOpen = false }: Props) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const closed = task.status === 'done';
  const due = documentDueText(task);
  // El listado puede traer la cantidad de adjuntos; si no la trae, no se inventa: el panel los pide al abrirse.
  const count = task.attachments?.length;

  return (
    <Card className={cx(!closed && task.expirationStatus === 'expired' && 'border-danger/40')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 rounded-xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-outline-soft bg-bg text-ink-2"
          >
            <FileText className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-ink">{task.plan?.name ?? 'Plan eliminado'}</span>
            <span className="mt-0.5 block text-xs text-muted">
              {task.referenceNumber ? `${task.referenceNumber} · ` : ''}
              {task.dueAt ? `Vence el ${formatDay(task.dueAt)}` : 'Sin fecha de vencimiento'}
              {!closed && due ? ` · ${due}` : ''}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {closed ? (
            <Badge label={labelOf(FLEET_TASK_STATUS, task.status)} />
          ) : (
            task.expirationStatus && <Badge label={labelOf(FLEET_EXPIRATION_STATUS, task.expirationStatus)} />
          )}
          {count !== undefined && count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted" aria-label={`${count} archivos`}>
              <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
              {count}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cx('h-4 w-4 text-muted transition-transform', open && 'rotate-180')}
          />
        </span>
      </button>
      {open && (
        <div id={panelId} className="border-t border-outline p-4">
          <FleetTaskAttachments taskId={task.taskId} canWrite={canWrite} />
        </div>
      )}
    </Card>
  );
};
