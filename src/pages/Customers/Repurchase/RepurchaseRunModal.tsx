import { Button, Modal } from '../../../common/components/ui';
import type { RepurchaseRun } from '../../../services/api/types';
import { formatDate } from '../../../utils/format';
import { ESTIMATE_SOURCE, runSummary } from './repurchaseLabels';

interface Props {
  result: RepurchaseRun;
  onClose: () => void;
}

/** La simulación de la corrida: a quién se invitaría hoy, sin haber escrito ni avisado a nadie. */
export const RepurchaseRunModal = ({ result, onClose }: Props) => (
  <Modal
    open
    onClose={onClose}
    size="md"
    title="Simulación de la corrida"
    description="Así quedaría la corrida de hoy. No se creó ninguna invitación ni se avisó a nadie."
    footer={<Button onClick={onClose}>Cerrar</Button>}
  >
    <p className="text-sm text-ink-2">
      {result.evaluated} cliente(s) evaluados · {runSummary(result)}
    </p>
    {result.candidates.length === 0 ? (
      <p className="mt-4 text-sm text-muted">Hoy no se invitaría a nadie.</p>
    ) : (
      <ul className="mt-4 divide-y divide-outline-soft" aria-label="Clientes a invitar">
        {result.candidates.map((c) => (
          <li key={c.userId} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-ink">{c.fullName ?? 'Sin nombre'}</span>
            <span className="text-[13px] text-muted">
              {c.totalUnits} {c.totalUnits === 1 ? 'garrafa' : 'garrafas'} · se le acaba el{' '}
              {formatDate(c.projectedDepletionAt)} · {ESTIMATE_SOURCE[c.source]}
            </span>
          </li>
        ))}
      </ul>
    )}
  </Modal>
);
