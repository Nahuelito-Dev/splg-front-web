import { Download, Eye, Trash2 } from 'lucide-react';
import { Button, DetailList, Modal, UserRefLink } from '../../../common/components/ui';
import type { FleetTaskAttachment } from '../../../services/api/types';
import type { UserNames } from '../../../services/queries/userNames';
import { formatDateTime } from '../../../utils/format';
import { fleetAttachmentIcon, formatAttachmentSize } from './fleetAttachmentIcon';

interface Props {
  attachment: FleetTaskAttachment | null;
  onClose: () => void;
  canWrite: boolean;
  pending: boolean;
  names: UserNames;
  onView: (attachment: FleetTaskAttachment) => void;
  onDownload: (attachment: FleetTaskAttachment) => void;
  onDelete: (attachment: FleetTaskAttachment) => void;
}

/** El panel de detalle de un adjunto: sus propiedades y las acciones (ver, descargar, borrar). */
export const FleetAttachmentDetailModal = ({
  attachment,
  onClose,
  canWrite,
  pending,
  names,
  onView,
  onDownload,
  onDelete,
}: Props) => {
  if (!attachment) return null;
  const Icon = fleetAttachmentIcon(attachment.mimeType);

  return (
    <Modal open onClose={onClose} title={attachment.originalName}>
      <div className="space-y-5">
        <div className="flex items-center justify-center rounded-xl border border-outline-soft bg-bg py-8">
          <Icon className="h-14 w-14 text-ink-2" strokeWidth={1.5} />
        </div>
        <DetailList
          items={[
            { label: 'Tipo', value: attachment.mimeType },
            { label: 'Tamaño', value: formatAttachmentSize(attachment.sizeBytes) },
            { label: 'Subido el', value: formatDateTime(attachment.uploadedAt) },
            {
              label: 'Subido por',
              value: attachment.uploadedByUserId ? (
                <UserRefLink
                  userId={attachment.uploadedByUserId}
                  name={names.nameOf(attachment.uploadedByUserId)}
                  loading={names.loading}
                />
              ) : (
                'Sin dato'
              ),
            },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<Eye />} disabled={pending} onClick={() => onView(attachment)}>
            Ver
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download />}
            disabled={pending}
            onClick={() => onDownload(attachment)}
          >
            Descargar
          </Button>
          {canWrite && (
            <Button variant="secondary" size="sm" icon={<Trash2 />} onClick={() => onDelete(attachment)}>
              Borrar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
