import { useState } from 'react';
import { photoRemovable, type PhotoKind } from '../../../services/api/photos';
import { toApiError } from '../../../services/api/errors';
import {
  isSignedPhotoUrl,
  usePhotoLink,
  useRemovePhoto,
  useRenewablePhoto,
  useUploadPhoto,
} from '../../../services/queries/photos';
import { confirm, notify } from '../../../utils/notifications';
import { photoErrorMessage, photoFileError, photoLimitsText } from '../../../utils/photos';
import { ImageInput } from './ImageInput';
import { Modal } from './Modal';

interface Props {
  kind: PhotoKind;
  id: string;
  /** La `photoUrl` firmada que mandó el back (nunca se reenvía en un PATCH). */
  url: string | null | undefined;
  /** Qué foto es, para los textos: «del vehículo», «del producto», «de perfil»… */
  subject: string;
  /** Si el rol puede cambiarla. Si no, se ve pero no se ofrece ninguna acción (el back contestaría 403). */
  canEdit: boolean;
  /** Se puede editar en general pero hoy no (p. ej. la incidencia ya no está abierta): se explica el motivo. */
  blockedReason?: string;
  /** Título de la sección (por defecto «Foto»). */
  label?: string;
  /** Logos: se ven enteros, sin recortar. */
  fit?: 'cover' | 'contain';
  className?: string;
}

/**
 * Foto de un registro: miniatura que se amplía, y subir, reemplazar y quitar con confirmación. Muestra la URL
 * firmada que manda el back; si venció la renueva sola.
 */
export const EntityPhoto = ({
  kind,
  id,
  url,
  subject,
  canEdit,
  blockedReason,
  label = 'Foto',
  fit = 'cover',
  className,
}: Props) => {
  // El error pertenece a la foto (id + url) en la que ocurrió: al cambiar una u otra deja de mostrarse.
  const errorKey = `${kind}:${id}:${url ?? ''}`;
  const [inlineError, setInlineError] = useState<{ key: string; message: string } | null>(null);
  const error = inlineError?.key === errorKey ? inlineError.message : null;
  const setError = (message: string | null) => setInlineError(message ? { key: errorKey, message } : null);
  const [zoomed, setZoomed] = useState(false);
  const photo = useRenewablePhoto(kind, id, url);
  const upload = useUploadPhoto(kind);
  const remove = useRemovePhoto(kind);
  // Sólo una foto de S3 se puede quitar o reemplazar como tal: una URL externa vieja se muestra, pero el back no la
  // borra (subir una la reemplaza).
  const hasPhoto = isSignedPhotoUrl(url) && !photo.none;
  const busy = upload.isPending || remove.isPending;

  const fail = (error: unknown) => {
    const apiError = toApiError(error);
    const message = photoErrorMessage(kind, apiError.status, apiError.message);
    setError(message);
    notify.error(new Error(message));
  };

  const reject = (message: string) => {
    setError(message);
    notify.error(new Error(message));
  };

  const handleFile = (file: File) => {
    if (!canEdit || blockedReason) return;
    if (busy) {
      reject('Esperá a que termine la operación en curso.');
      return;
    }
    const invalid = photoFileError(kind, file);
    if (invalid) {
      reject(invalid);
      return;
    }
    setError(null);
    upload.mutate(
      { id, file },
      { onSuccess: () => notify.success(hasPhoto ? 'Foto reemplazada' : 'Foto subida'), onError: fail },
    );
  };

  const handleRemove = async () => {
    const confirmed = await confirm({
      title: '¿Quitar la foto?',
      text: `Se quita la foto ${subject}. Podés subir otra cuando quieras.`,
      confirmText: 'Quitar',
      danger: true,
    });
    if (!confirmed) return;
    setError(null);
    remove.mutate(id, { onSuccess: () => notify.success('Foto quitada'), onError: fail });
  };

  const openZoom = () => {
    photo.renewIfExpired();
    setZoomed(true);
  };

  return (
    <div className={className}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</h3>
      <ImageInput
        inputLabel={`Elegir la foto ${subject}`}
        subject={subject}
        src={photo.src}
        broken={photo.failed}
        retrying={photo.renewing}
        onRetry={() => {
          setError(null);
          photo.retry();
        }}
        hint={photoLimitsText(kind)}
        fit={fit}
        canEdit={canEdit}
        blockedReason={blockedReason}
        busy={busy}
        busyLabel={remove.isPending ? 'Quitando…' : 'Subiendo…'}
        error={error}
        onFile={handleFile}
        onReject={reject}
        onRemove={hasPhoto && photoRemovable(kind) ? () => void handleRemove() : undefined}
        onZoom={openZoom}
        onImageError={photo.handleError}
      />
      <Modal open={zoomed && Boolean(photo.src)} onClose={() => setZoomed(false)} title={`Foto ${subject}`} size="lg">
        {photo.src && (
          <img
            src={photo.src}
            alt={`Foto ${subject}, ampliada`}
            className="mx-auto max-h-[60vh] rounded-lg"
            onError={photo.handleError}
          />
        )}
      </Modal>
    </div>
  );
};

/**
 * `EntityPhoto` para los recursos cuya respuesta no trae `photoUrl` (proveedor, envase, carga): primero pide el
 * enlace a la foto y después se comporta igual.
 */
export const LinkedEntityPhoto = (props: Omit<Props, 'url'>) => {
  const link = usePhotoLink(props.kind, props.id);
  return <EntityPhoto {...props} url={link.isPending ? undefined : (link.data?.url ?? null)} />;
};
