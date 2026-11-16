import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormError, FormTextArea, Modal } from '../../../common/components/ui';
import { fleetAttachmentIcon, formatAttachmentSize } from '../../../pages/Fleet/components/fleetAttachmentIcon';
import type { ChatAttachmentInput, OnUploadProgress } from '../../../services/api/chatAttachments';
import { errorMessage, toApiError } from '../../../services/api/errors';
import { newUuid } from '../../../utils/uuid';
import {
  acceptOf,
  CAPTION_MAX,
  chatAttachmentSchema,
  isImageType,
  limitsTextOf,
  type ChatAttachmentChannel,
  type ChatAttachmentValues,
} from '../attachments';

interface Props {
  channel: ChatAttachmentChannel;
  /** Sube el adjunto; el error (413/415/429…) vuelve con el texto de la API. */
  onUpload: (input: ChatAttachmentInput, onProgress?: OnUploadProgress) => Promise<unknown>;
}

/** La vista previa local de una foto elegida (antes de subirla). Se libera al cambiarla o al cerrar. */
const useLocalPreview = (file: File | null) => {
  const url = useMemo(() => (file && isImageType(file.type) ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return url;
};

/**
 * El clip del compositor: elige un archivo (con el `accept` del canal), muestra qué se va a mandar con su epígrafe
 * opcional y lo sube con su barra de avance. Cada archivo elegido lleva su `clientMessageId`: «Reintentar» lo repite y
 * la API no lo duplica. Lo que no entra en el canal (tipo o tamaño) se avisa antes de subir.
 */
export const AttachButton = ({ channel, onUpload }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [clientMessageId, setClientMessageId] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  /**
   * Un corte o un error del servidor se arregla reintentando con el mismo id; un 4xx (tipo, tamaño, tope del día), no.
   * Mientras haya un reintento pendiente el epígrafe queda fijo: el primer envío pudo haberse guardado (se cortó la
   * respuesta) y el reintento con el mismo id devuelve ése; con otro epígrafe se vería uno distinto del que se escribió,
   * y con un id nuevo quedaría duplicado. Para cambiarlo: «Cambiar» el archivo o cancelar (otro envío, otro id).
   */
  const [retryable, setRetryable] = useState(false);
  const schema = useMemo(() => chatAttachmentSchema(channel), [channel]);
  const methods = useForm<ChatAttachmentValues>({
    resolver: zodResolver(schema),
    defaultValues: { file: null, caption: '' },
    mode: 'onChange',
  });
  const file = methods.watch('file');
  const caption = methods.watch('caption');
  const preview = useLocalPreview(file);
  const uploading = progress !== null;

  const choose = () => input.current?.click();

  const onFile = (chosen: File | undefined) => {
    if (!chosen) return;
    // Otro archivo es otro envío: id nuevo. El epígrafe escrito se conserva.
    setClientMessageId(newUuid());
    setServerError(null);
    setRetryable(false);
    methods.setValue('file', chosen, { shouldValidate: true });
    setOpen(true);
  };

  const close = () => {
    if (uploading) return;
    setOpen(false);
    setServerError(null);
    setRetryable(false);
    methods.reset({ file: null, caption: '' });
  };

  const submit = async (values: ChatAttachmentValues) => {
    if (!values.file) return;
    setServerError(null);
    setProgress(0);
    try {
      await onUpload(
        { file: values.file, clientMessageId, ...(values.caption ? { caption: values.caption } : {}) },
        setProgress,
      );
      setProgress(null);
      setRetryable(false);
      setOpen(false);
      methods.reset({ file: null, caption: '' });
    } catch (error) {
      const status = toApiError(error).status;
      setProgress(null);
      setRetryable(status === null || status >= 500);
      setServerError(errorMessage(error));
    }
  };

  const Icon = file ? fleetAttachmentIcon(file.type) : null;

  return (
    <>
      <button
        type="button"
        onClick={choose}
        aria-label="Adjuntar un archivo"
        title="Adjuntar un archivo"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-outline bg-surface text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Paperclip aria-hidden="true" className="h-4 w-4" />
      </button>
      <input
        ref={input}
        type="file"
        accept={acceptOf(channel)}
        className="hidden"
        data-testid="chat-attachment-input"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          // Elegir el mismo archivo otra vez también avisa.
          event.target.value = '';
        }}
      />
      <Modal
        open={open}
        onClose={close}
        closeBlocked={uploading}
        title="Mandar un archivo"
        description={limitsTextOf(channel)}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={uploading}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} loading={uploading}>
              {serverError && retryable ? 'Reintentar' : 'Enviar'}
            </Button>
          </>
        }
      >
        <Form methods={methods} onSubmit={submit} id={formId} className="space-y-4">
          {file && (
            <div className="flex items-center gap-3 rounded-xl border border-outline bg-surface-muted p-2.5">
              {preview ? (
                <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                Icon && (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-surface text-ink-2">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                )
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink" title={file.name}>
                  {file.name}
                </span>
                <span className="block text-xs text-muted">{formatAttachmentSize(file.size)}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={choose} disabled={uploading}>
                Cambiar
              </Button>
            </div>
          )}
          <FormError name="file" />
          <FormTextArea
            name="caption"
            label="Epígrafe (opcional)"
            placeholder="Contá de qué se trata"
            rows={2}
            disabled={uploading}
            readOnly={retryable}
            hint={
              retryable
                ? 'El reintento va con el mismo epígrafe. Para cambiarlo, cambiá el archivo o cancelá.'
                : `${caption.length}/${CAPTION_MAX}`
            }
          />
          {uploading && (
            <div className="space-y-1">
              <div
                role="progressbar"
                aria-label="Subiendo el archivo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-2 overflow-hidden rounded-full bg-surface-muted"
              >
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted">
                {progress !== null && progress >= 100 ? 'Verificando y guardando…' : `Subiendo… ${progress}%`}
              </p>
            </div>
          )}
          {serverError && (
            <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          )}
        </Form>
      </Modal>
    </>
  );
};
