import { Download, Loader2, RotateCw, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, cx, Modal, Skeleton } from '../../../common/components/ui';
import { fleetAttachmentIcon, formatAttachmentSize } from '../../../pages/Fleet/components/fleetAttachmentIcon';
import { errorMessage } from '../../../services/api/errors';
import type { ChatAttachment } from '../../../services/api/types';
import {
  useChatAttachmentLink,
  useFreshChatAttachmentLink,
  type ChatAttachmentLinkFn,
} from '../../../services/queries/chatAttachments';
import { saveFileSource } from '../../../utils/fileSource';
import { attachmentStateOf, isImageType } from '../attachments';

interface Props {
  messageId: string;
  attachment: ChatAttachment;
  /** El epígrafe: el texto alternativo de la foto (si no hay, su nombre). */
  caption: string | null;
  /** Pide el enlace firmado por el endpoint del hilo. Sin esto sólo se muestra qué es, nunca el archivo. */
  link?: ChatAttachmentLinkFn;
}

/**
 * La caja de la miniatura: hasta 240 × 280, con la proporción de la foto, pero nunca menos de 120 de ancho ni de 64 de
 * alto (una foto muy angosta o muy apaisada se recorta con `object-cover`). Con las medidas no salta al cargar.
 */
const THUMB_MAX_WIDTH = 240;
const THUMB_MAX_HEIGHT = 280;
const THUMB_MIN_WIDTH = 120;
const THUMB_MIN_HEIGHT = 64;

const thumbSize = ({ width, height }: Pick<ChatAttachment, 'width' | 'height'>) => {
  if (!width || !height) return { width: THUMB_MAX_WIDTH, height: 180 };
  const scale = Math.min(THUMB_MAX_WIDTH / width, THUMB_MAX_HEIGHT / height, 1);
  return {
    width: Math.max(THUMB_MIN_WIDTH, Math.round(width * scale)),
    height: Math.max(THUMB_MIN_HEIGHT, Math.round(height * scale)),
  };
};

/** Ocupa la caja de la miniatura y se achica con el ancho disponible sin perder la proporción. */
const boxStyle = (size: { width: number; height: number }) => ({
  width: size.width,
  maxWidth: '100%',
  aspectRatio: `${size.width} / ${size.height}`,
});

const Notice = ({ icon, text, tone }: { icon: ReactNode; text: string; tone: 'muted' | 'danger' }) => (
  <p
    className={cx(
      'flex items-center gap-1.5 text-xs font-medium',
      tone === 'danger' ? 'text-danger' : 'text-muted',
      '[&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0',
    )}
  >
    {icon}
    {text}
  </p>
);

/** Sin enlace (el hilo no sabe pedirlo): nunca se llama, porque sin `link` no se ofrece descargar. */
const noLink: ChatAttachmentLinkFn = () => Promise.reject(new Error('Este hilo no baja archivos'));

/** La tarjeta de un archivo: ícono, nombre, tamaño y lo que se puede hacer según su escaneo. */
const FileCard = ({ messageId, attachment, link }: Omit<Props, 'caption'>) => {
  const state = attachmentStateOf(attachment);
  const fresh = useFreshChatAttachmentLink(link ?? noLink);
  const Icon = fleetAttachmentIcon(attachment.mimeType);
  const download = () =>
    fresh.mutate(messageId, {
      onSuccess: (data) =>
        saveFileSource({ kind: 'url', url: data.url, expiresAt: data.expiresAt }, attachment.fileName),
    });
  return (
    <div className="flex w-64 max-w-full flex-col gap-2 rounded-xl border border-outline bg-surface p-2.5 text-ink">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-ink-2">
          <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium" title={attachment.fileName}>
            {attachment.fileName}
          </span>
          <span className="block text-[11px] text-muted">{formatAttachmentSize(attachment.sizeBytes)}</span>
        </span>
      </div>
      {state === 'pending' && (
        <Notice
          icon={<Loader2 aria-hidden="true" className="animate-spin" />}
          text="Verificando el archivo…"
          tone="muted"
        />
      )}
      {state === 'failed' && (
        <Notice icon={<ShieldQuestion aria-hidden="true" />} text="No se pudo verificar el archivo" tone="danger" />
      )}
      {state === 'ready' && link && (
        <Button
          size="sm"
          variant="secondary"
          icon={<Download aria-hidden="true" />}
          loading={fresh.isPending}
          onClick={download}
          aria-label={`Descargar ${attachment.fileName}`}
        >
          Descargar
        </Button>
      )}
      {fresh.isError && (
        <p role="alert" className="text-xs text-danger">
          {errorMessage(fresh.error)}
        </p>
      )}
    </div>
  );
};

/**
 * La miniatura de una foto: el enlace se pide al mostrarla. Si la imagen no carga (venció la firma o se cortó), se pide
 * un enlace nuevo UNA vez; si vuelve a fallar, queda el error con «Reintentar» (sin pedidos en bucle).
 */
const PhotoThumb = ({ messageId, attachment, caption, link }: Props & { link: ChatAttachmentLinkFn }) => {
  const [open, setOpen] = useState(false);
  const [retried, setRetried] = useState(false);
  const [broken, setBroken] = useState(false);
  const thumb = useChatAttachmentLink(link, messageId, true);
  const size = thumbSize(attachment);
  const alt = caption?.trim() || attachment.fileName;
  // «Reintentar» a mano: hasta que llegue el enlace nuevo no se vuelve a mostrar el que falló.
  const [reloading, setReloading] = useState(false);
  const retry = () => {
    setBroken(false);
    setReloading(true);
    void thumb.refetch().finally(() => setReloading(false));
  };

  if (thumb.isPending || reloading) {
    return (
      <span role="status" aria-label="Cargando la foto" className="block" style={boxStyle(size)}>
        <Skeleton className="h-full w-full rounded-xl" />
      </span>
    );
  }
  if (thumb.isError || broken) {
    return (
      <div className="flex w-64 max-w-full flex-col gap-1.5 rounded-xl border border-outline bg-surface p-2.5 text-ink">
        <p role="alert" className="text-xs text-danger">
          {thumb.isError ? errorMessage(thumb.error) : 'No se pudo mostrar la foto.'}
        </p>
        <Button size="sm" variant="secondary" icon={<RotateCw aria-hidden="true" />} onClick={retry}>
          Reintentar
        </Button>
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ver la foto ${attachment.fileName} en grande`}
        className="block overflow-hidden rounded-xl border border-outline bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        style={boxStyle(size)}
      >
        <img
          src={thumb.data.url}
          alt={alt}
          width={size.width}
          height={size.height}
          loading="lazy"
          className="block h-full w-full object-cover"
          onError={() => {
            if (retried) {
              setBroken(true);
              return;
            }
            setRetried(true);
            void thumb.refetch();
          }}
        />
      </button>
      <PhotoViewer
        open={open}
        onClose={() => setOpen(false)}
        messageId={messageId}
        attachment={attachment}
        alt={alt}
        link={link}
      />
    </>
  );
};

/** El visor ampliado: pide un enlace nuevo al abrirse (el de la miniatura pudo vencer). Esc y la cruz lo cierran. */
const PhotoViewer = ({
  open,
  onClose,
  messageId,
  attachment,
  alt,
  link,
}: {
  open: boolean;
  onClose: () => void;
  messageId: string;
  attachment: ChatAttachment;
  alt: string;
  link: ChatAttachmentLinkFn;
}) => {
  const fresh = useFreshChatAttachmentLink(link);
  // «Descargar» pide su propio enlace: el de la vista pudo vencer mientras se miraba la foto.
  const download = useFreshChatAttachmentLink(link);
  const { mutate, reset } = fresh;
  const resetDownload = download.reset;
  useEffect(() => {
    if (open) mutate(messageId);
    else {
      reset();
      resetDownload();
    }
  }, [open, messageId, mutate, reset, resetDownload]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={attachment.fileName}
      description={formatAttachmentSize(attachment.sizeBytes)}
      size="lg"
      footer={
        <Button
          variant="secondary"
          icon={<Download aria-hidden="true" />}
          loading={download.isPending}
          onClick={() =>
            download.mutate(messageId, {
              onSuccess: (data) =>
                saveFileSource({ kind: 'url', url: data.url, expiresAt: data.expiresAt }, attachment.fileName),
            })
          }
        >
          Descargar
        </Button>
      }
    >
      {download.isError && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {errorMessage(download.error)}
        </p>
      )}
      {fresh.isPending && (
        <span role="status" aria-label="Cargando la foto" className="block h-64">
          <Skeleton className="h-full w-full rounded-xl" />
        </span>
      )}
      {fresh.isError && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-danger">
            {errorMessage(fresh.error)}
          </p>
          <Button size="sm" variant="secondary" onClick={() => fresh.mutate(messageId)}>
            Reintentar
          </Button>
        </div>
      )}
      {fresh.data && <img src={fresh.data.url} alt={alt} className="mx-auto block max-h-[60vh] w-auto max-w-full" />}
    </Modal>
  );
};

/**
 * El adjunto de un mensaje (CH7): una foto como miniatura que se amplía, un archivo como tarjeta con «Descargar». La
 * URL nunca viene en el mensaje ni se guarda: se pide al verla. Mientras el antivirus no lo revisó no se baja; si lo
 * bloqueó, no se muestra nada del archivo.
 */
export const ChatAttachmentItem = ({ messageId, attachment, caption, link }: Props) => {
  const state = attachmentStateOf(attachment);
  if (state === 'blocked') {
    return (
      <div className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2">
        <Notice icon={<ShieldAlert aria-hidden="true" />} text="Archivo bloqueado por seguridad" tone="danger" />
      </div>
    );
  }
  if (state === 'ready' && link && isImageType(attachment.mimeType)) {
    return <PhotoThumb messageId={messageId} attachment={attachment} caption={caption} link={link} />;
  }
  return <FileCard messageId={messageId} attachment={attachment} link={link} />;
};
