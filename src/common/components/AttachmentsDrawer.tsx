import { AttachmentsPanel } from './AttachmentsPanel';
import { Drawer } from './ui';
import type { AttachmentOwnerType } from '../../services/api/types';

interface Props {
  /** El dueño de los adjuntos; con `null` el panel queda cerrado. */
  owner: { ownerType: AttachmentOwnerType; ownerId: string; description: string } | null;
  onClose: () => void;
  canWrite: boolean;
  blockedReason?: string;
  title?: string;
  hint?: string;
}

/** Los adjuntos de una fila de una lista (comprobantes), en un panel lateral. */
export const AttachmentsDrawer = ({ owner, onClose, canWrite, blockedReason, title = 'Comprobantes', hint }: Props) => (
  <Drawer open={owner !== null} onClose={onClose} title={title} description={owner?.description ?? ''}>
    {owner && (
      <AttachmentsPanel
        ownerType={owner.ownerType}
        ownerId={owner.ownerId}
        canWrite={canWrite}
        blockedReason={blockedReason}
        title="Adjuntos"
        hint={hint}
      />
    )}
  </Drawer>
);
