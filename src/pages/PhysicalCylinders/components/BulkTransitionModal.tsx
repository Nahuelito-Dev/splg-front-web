import { AffectedList, Button, Modal } from '../../../common/components/ui';
import type { Cylinder } from '../../../services/api/types';
import { CYLINDER_STATE, labelOf } from '../../../utils/statusLabels';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Los envases que de verdad van a cambiar (los marcados y visibles que pueden pasar al estado). */
  cylinders: Cylinder[];
  /** Cuántos de los marcados no pueden pasar y se omiten. */
  skipped: number;
  toState: Cylinder['state'];
  verb: string;
}

/** Confirma una acción en lote sobre envases, con la lista de lo que se va a afectar. */
export const BulkTransitionModal = ({ open, onClose, onConfirm, cylinders, skipped, toState, verb }: Props) => (
  <Modal
    open={open}
    onClose={onClose}
    title={`${verb}: ${cylinders.length} ${cylinders.length === 1 ? 'envase' : 'envases'}`}
    description={`Pasan a "${labelOf(CYLINDER_STATE, toState).text}".`}
    footer={
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} disabled={cylinders.length === 0}>
          {verb}
        </Button>
      </>
    }
  >
    <div className="space-y-3">
      <AffectedList items={cylinders.map((cylinder) => cylinder.serial)} />
      {skipped > 0 && (
        <p className="text-sm text-muted">
          {skipped} {skipped === 1 ? 'de los marcados no puede pasar' : 'de los marcados no pueden pasar'} a ese estado
          desde el que {skipped === 1 ? 'está' : 'están'} y se {skipped === 1 ? 'omite' : 'omiten'}.
        </p>
      )}
    </div>
  </Modal>
);
