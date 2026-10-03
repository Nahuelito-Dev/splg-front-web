import { UserRefLink } from '../../../common/components/ui';
import type { FleetTaskAttachment } from '../../../services/api/types';
import type { UserNames } from '../../../services/queries/userNames';
import { formatDateTime } from '../../../utils/format';
import { fleetAttachmentIcon, formatAttachmentSize } from './fleetAttachmentIcon';

interface Props {
  attachments: FleetTaskAttachment[];
  onOpen: (attachment: FleetTaskAttachment) => void;
  names: UserNames;
}

/** Vista en grilla de los adjuntos, estilo explorador de archivos: una tarjeta por archivo. */
export const FleetAttachmentGrid = ({ attachments, onOpen, names }: Props) => (
  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {attachments.map((attachment) => {
      const Icon = fleetAttachmentIcon(attachment.mimeType);
      return (
        <li
          key={attachment.attachmentId}
          className="flex flex-col rounded-xl border border-outline transition-colors hover:border-primary-edge hover:bg-surface-hover"
        >
          <button
            type="button"
            onClick={() => onOpen(attachment)}
            className="flex w-full flex-col items-start gap-2 rounded-xl p-3 text-left"
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
          {attachment.uploadedByUserId && (
            <p className="truncate px-3 pb-3 text-[11.5px] text-muted">
              Subió{' '}
              <UserRefLink
                userId={attachment.uploadedByUserId}
                name={names.nameOf(attachment.uploadedByUserId)}
                loading={names.loading}
              />
            </p>
          )}
        </li>
      );
    })}
  </ul>
);
