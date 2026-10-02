import type { FleetTaskAttachment } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { fleetAttachmentIcon, formatAttachmentSize } from './fleetAttachmentIcon';

interface Props {
  attachments: FleetTaskAttachment[];
  onOpen: (attachment: FleetTaskAttachment) => void;
}

/** Vista en grilla de los adjuntos, estilo explorador de archivos: una tarjeta por archivo. */
export const FleetAttachmentGrid = ({ attachments, onOpen }: Props) => (
  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {attachments.map((attachment) => {
      const Icon = fleetAttachmentIcon(attachment.mimeType);
      return (
        <li key={attachment.attachmentId}>
          <button
            type="button"
            onClick={() => onOpen(attachment)}
            className="flex w-full flex-col items-start gap-2 rounded-xl border border-outline p-3 text-left transition-colors hover:border-primary-edge hover:bg-surface-hover"
          >
            <span
              aria-hidden="true"
              className="grid h-11 w-11 place-items-center rounded-lg border border-outline-soft bg-bg text-ink-2"
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 w-full leading-tight">
              <p className="truncate text-sm font-semibold text-ink">{attachment.originalName}</p>
              <p className="truncate text-[11.5px] text-muted">
                {formatAttachmentSize(attachment.sizeBytes)} · {formatDateTime(attachment.uploadedAt)}
              </p>
            </div>
          </button>
        </li>
      );
    })}
  </ul>
);
