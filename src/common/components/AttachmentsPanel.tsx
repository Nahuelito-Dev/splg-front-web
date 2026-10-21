import { useState } from 'react';
import { Download, Eye, Trash2 } from 'lucide-react';
import { Button, DropZone, EmptyState, IconButton, Input, LoadingState } from './ui';
import { fleetAttachmentIcon, formatAttachmentSize } from '../../pages/Fleet/components/fleetAttachmentIcon';
import type { AttachmentOwnerType } from '../../services/api/types';
import {
  useAttachmentFile,
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from '../../services/queries/attachments';
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_LIMITS_TEXT, attachmentFileError } from '../../utils/attachments';
import { openFileSource, saveFileSource } from '../../utils/fileSource';
import { formatDateTime } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';

interface Props {
  ownerType: AttachmentOwnerType;
  ownerId: string;
  /** Si la sesión puede subir y borrar. Sin esto sólo se ven y se descargan. */
  canWrite: boolean;
  /** Título de la sección (por defecto «Adjuntos»). */
  title?: string;
  /** Qué se suele adjuntar, para el texto del vacío y el ejemplo de la etiqueta. */
  hint?: string;
  /** Por qué no se puede escribir ahora (p. ej. falta elegir una distribuidora). */
  blockedReason?: string;
}

/**
 * Adjuntos de cualquier dueño del back (`/attachments/:ownerType/:ownerId`): subir con etiqueta opcional, listar,
 * ver o descargar por URL firmada (siempre en una pestaña nueva, nunca se guarda ni se muestra la URL) y borrar.
 */
export const AttachmentsPanel = ({
  ownerType,
  ownerId,
  canWrite,
  title = 'Adjuntos',
  hint = 'DNI, licencia, contrato…',
  blockedReason,
}: Props) => {
  const [label, setLabel] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { data: attachments = [], isPending, error, refetch } = useAttachments(ownerType, ownerId);
  const upload = useUploadAttachment(ownerType, ownerId);
  const remove = useDeleteAttachment(ownerType, ownerId);
  const fileSource = useAttachmentFile();

  const handleFile = (file: File) => {
    const invalid = attachmentFileError(file);
    if (invalid) {
      notify.error(new Error(invalid));
      return;
    }
    upload.mutate(
      { file, label },
      {
        onSuccess: () => {
          setLabel('');
          notify.success('Adjunto subido');
        },
        onError: notify.error,
      },
    );
  };

  const withFile = (
    attachmentId: string,
    disposition: 'attachment' | 'inline',
    then: (source: Parameters<typeof openFileSource>[0]) => void,
  ) => {
    setPendingId(attachmentId);
    fileSource.mutate(
      { attachmentId, disposition },
      {
        onSuccess: then,
        onError: notify.error,
        onSettled: () => setPendingId(null),
      },
    );
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: '¿Borrar el adjunto?',
      text: `«${name}» deja de listarse en esta ficha.`,
      confirmText: 'Borrar',
      danger: true,
    });
    if (!confirmed) return;
    remove.mutate(id, { onSuccess: () => notify.success('Adjunto borrado'), onError: notify.error });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="flex h-10 items-center text-sm font-semibold text-ink">{title}</h3>
        {canWrite && (
          <div className="flex flex-wrap items-end gap-2">
            <Input
              label="Etiqueta (opcional)"
              placeholder={`Ej: ${hint.split(',')[0]}`}
              maxLength={80}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-48"
            />
          </div>
        )}
      </div>
      {canWrite && (
        <DropZone
          inputLabel="Elegir el archivo a adjuntar"
          accept={ATTACHMENT_ALLOWED_TYPES}
          onFile={handleFile}
          onReject={(message) => notify.error(new Error(message))}
          hint={ATTACHMENT_LIMITS_TEXT}
          loading={upload.isPending}
          blockedReason={blockedReason}
        />
      )}
      {isPending ? (
        <LoadingState label="Cargando adjuntos…" />
      ) : error ? (
        <EmptyState
          title="No se pudieron cargar los adjuntos"
          action={
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : attachments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-outline p-4 text-center text-sm text-muted">
          Sin adjuntos. {hint} (PDF, JPG, PNG o WEBP, hasta 10 MB).
        </p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = fleetAttachmentIcon(attachment.mimeType);
            const name = attachment.label || attachment.originalName;
            const busy = pendingId === attachment.attachmentId;
            return (
              <li
                key={attachment.attachmentId}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline p-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-outline-soft bg-bg text-ink-2"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold text-ink">{name}</p>
                    <p className="truncate text-[11.5px] text-muted">
                      {attachment.label ? `${attachment.originalName} · ` : ''}
                      {formatAttachmentSize(attachment.sizeBytes)} · {formatDateTime(attachment.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton
                    label={`Ver ${name}`}
                    icon={<Eye />}
                    disabled={busy}
                    onClick={() =>
                      withFile(attachment.attachmentId, 'inline', (source) => {
                        if (!openFileSource(source)) {
                          notify.error(new Error('El navegador bloqueó la ventana: habilitá los popups para verlo.'));
                        }
                      })
                    }
                  />
                  <IconButton
                    label={`Descargar ${name}`}
                    icon={<Download />}
                    disabled={busy}
                    onClick={() =>
                      withFile(attachment.attachmentId, 'attachment', (source) =>
                        saveFileSource(source, attachment.originalName),
                      )
                    }
                  />
                  {canWrite && (
                    <IconButton
                      label={`Borrar ${name}`}
                      tone="danger"
                      icon={<Trash2 />}
                      disabled={remove.isPending}
                      onClick={() => void handleDelete(attachment.attachmentId, name)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
