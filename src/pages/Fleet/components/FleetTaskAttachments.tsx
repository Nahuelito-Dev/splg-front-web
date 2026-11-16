import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Download, Eye, LayoutGrid, List, Paperclip, Trash2, Upload } from 'lucide-react';
import { Button, EmptyState, IconButton, LoadingState, UserRefLink, CardHeader } from '../../../common/components/ui';
import type { FleetTaskAttachment } from '../../../services/api/types';
import {
  useDeleteFleetTaskAttachment,
  useDownloadFleetTaskAttachment,
  useFleetTaskAttachments,
  useUploadFleetTaskAttachment,
} from '../../../services/queries/fleet';
import { useUserNames } from '../../../services/queries/userNames';
import { openFileSource, saveFileSource } from '../../../utils/fileSource';
import { formatDateTime } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { FleetAttachmentDetailModal } from './FleetAttachmentDetailModal';
import { FleetAttachmentGrid } from './FleetAttachmentGrid';
import { FLEET_ATTACHMENT_ALLOWED_TYPES, fleetAttachmentError } from './fleetAttachmentValidation';
import { formatAttachmentSize } from './fleetAttachmentIcon';

interface Props {
  taskId: string;
  canWrite: boolean;
}

type ViewMode = 'list' | 'grid';

export const FleetTaskAttachments = ({ taskId, canWrite }: Props) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [detail, setDetail] = useState<FleetTaskAttachment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // dragenter/dragleave se disparan también al cruzar los hijos: se cuentan para que el resalte no parpadee.
  const dragDepth = useRef(0);
  const { data: attachments = [], isPending, error, refetch } = useFleetTaskAttachments(taskId);
  const names = useUserNames(attachments.map((attachment) => attachment.uploadedByUserId));
  const upload = useUploadFleetTaskAttachment();
  const download = useDownloadFleetTaskAttachment();
  const remove = useDeleteFleetTaskAttachment();

  const uploadFile = (file: File) => {
    const error = fleetAttachmentError(file);
    if (error) {
      notify.error(new Error(error));
      return;
    }
    upload.mutate(
      { taskId, file },
      {
        onSuccess: () => notify.success('Adjunto subido'),
        onError: notify.error,
      },
    );
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) uploadFile(file);
  };

  const hasFiles = (event: DragEvent<HTMLDivElement>) => Array.from(event.dataTransfer.types).includes('Files');
  const canDrop = canWrite && !upload.isPending;

  const resetDrag = () => {
    dragDepth.current = 0;
    setIsDragging(false);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    if (canDrop) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    // Siempre se cancela: si no, el navegador abre el archivo soltado y se pierde el panel.
    event.preventDefault();
    resetDrag();
    if (!canDrop) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;
    if (files.length > 1) notify.info('Se sube un archivo por vez: se subió el primero.');
    uploadFile(files[0]);
  };

  const handleView = (attachment: FleetTaskAttachment) => {
    setPendingId(attachment.attachmentId);
    download.mutate(
      { taskId, attachmentId: attachment.attachmentId },
      {
        onSuccess: (source) => {
          if (!openFileSource(source)) {
            notify.error(new Error('El navegador bloqueó la ventana: habilitá los popups para verlo.'));
          }
        },
        onError: notify.error,
        onSettled: () => setPendingId(null),
      },
    );
  };

  const handleDownload = (attachment: FleetTaskAttachment) => {
    setPendingId(attachment.attachmentId);
    download.mutate(
      { taskId, attachmentId: attachment.attachmentId },
      {
        onSuccess: (source) => saveFileSource(source, attachment.originalName),
        onError: notify.error,
        onSettled: () => setPendingId(null),
      },
    );
  };

  const handleDelete = async (attachment: FleetTaskAttachment) => {
    const confirmed = await confirm({
      title: '¿Dar de baja el adjunto?',
      text: `Baja lógica: «${attachment.originalName}» deja de listarse. El archivo no se borra del almacenamiento.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return false;
    remove.mutate(
      { taskId, attachmentId: attachment.attachmentId },
      {
        onSuccess: () => notify.success('Adjunto dado de baja'),
        onError: notify.error,
      },
    );
    return true;
  };

  return (
    <div
      className={
        isDragging
          ? 'space-y-3 rounded-xl bg-primary/5 outline-dashed outline-2 outline-offset-4 outline-primary-edge'
          : 'space-y-3'
      }
      onDragEnter={handleDragEnter}
      onDragOver={(event) => {
        if (hasFiles(event)) event.preventDefault();
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardHeader title="Adjuntos" as="h3" className="" />
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-lg border border-outline p-0.5">
            <IconButton
              label="Ver en lista"
              icon={<List />}
              active={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            />
            <IconButton
              label="Ver en grilla"
              icon={<LayoutGrid />}
              active={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
            />
          </div>
          {canWrite && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept={FLEET_ATTACHMENT_ALLOWED_TYPES.join(',')}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload />}
                loading={upload.isPending}
                onClick={() => fileInput.current?.click()}
              >
                Adjuntar archivo
              </Button>
            </>
          )}
        </div>
      </div>
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
        <p className="text-sm text-muted">
          {canWrite
            ? 'Sin adjuntos. Arrastrá un archivo acá o usá "Adjuntar archivo" (PDF, JPG, PNG o WEBP, hasta 10 MB).'
            : 'Sin adjuntos. PDF, JPG, PNG o WEBP, hasta 10 MB.'}
        </p>
      ) : viewMode === 'grid' ? (
        <FleetAttachmentGrid attachments={attachments} onOpen={setDetail} names={names} />
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.attachmentId}
              className="flex items-center justify-between gap-3 rounded-xl border border-outline p-3"
            >
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setDetail(attachment)}
                  className="flex min-w-0 items-center gap-2.5 text-left"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-outline-soft bg-bg text-ink-2"
                  >
                    <Paperclip className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold text-ink">{attachment.originalName}</p>
                    <p className="truncate text-[11.5px] text-muted">
                      {formatAttachmentSize(attachment.sizeBytes)} · subido el {formatDateTime(attachment.uploadedAt)}
                    </p>
                  </div>
                </button>
                {attachment.uploadedByUserId && (
                  <p className="mt-1 truncate pl-[46px] text-[11.5px] text-muted">
                    Subió{' '}
                    <UserRefLink
                      userId={attachment.uploadedByUserId}
                      name={names.nameOf(attachment.uploadedByUserId)}
                      loading={names.loading}
                    />
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton
                  label={`Ver ${attachment.originalName}`}
                  icon={<Eye />}
                  disabled={pendingId === attachment.attachmentId}
                  onClick={() => handleView(attachment)}
                />
                <IconButton
                  label={`Descargar ${attachment.originalName}`}
                  icon={<Download />}
                  disabled={pendingId === attachment.attachmentId}
                  onClick={() => handleDownload(attachment)}
                />
                {canWrite && (
                  <IconButton
                    label={`Dar de baja ${attachment.originalName}`}
                    tone="danger"
                    icon={<Trash2 />}
                    onClick={() => void handleDelete(attachment)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <FleetAttachmentDetailModal
        attachment={detail}
        onClose={() => setDetail(null)}
        canWrite={canWrite}
        pending={Boolean(detail && pendingId === detail.attachmentId)}
        names={names}
        onView={(attachment) => {
          handleView(attachment);
        }}
        onDownload={(attachment) => {
          handleDownload(attachment);
        }}
        onDelete={(attachment) => {
          // El modal sigue abierto hasta que confirmen: si cancelan, no se pierde el contexto.
          void handleDelete(attachment).then((confirmed) => {
            if (confirmed) setDetail(null);
          });
        }}
      />
    </div>
  );
};
