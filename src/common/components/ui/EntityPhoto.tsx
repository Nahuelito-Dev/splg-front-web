import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Maximize2, Trash2 } from 'lucide-react';
import { PHOTO_ALLOWED_TYPES, photoRemovable, type PhotoKind } from '../../../services/api/photos';
import { toApiError } from '../../../services/api/errors';
import { isSignedPhotoUrl, useRemovePhoto, useRenewablePhoto, useUploadPhoto } from '../../../services/queries/photos';
import { confirm, notify } from '../../../utils/notifications';
import { photoErrorMessage, photoFileError } from '../../../utils/photos';
import { Button } from './Button';
import { cx } from './cx';
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
  const fileInput = useRef<HTMLInputElement>(null);
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
    notify.error(new Error(photoErrorMessage(kind, apiError.status, apiError.message)));
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const invalid = photoFileError(kind, file);
    if (invalid) {
      notify.error(new Error(invalid));
      return;
    }
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
    remove.mutate(id, { onSuccess: () => notify.success('Foto quitada'), onError: fail });
  };

  const openZoom = () => {
    photo.renewIfExpired();
    setZoomed(true);
  };

  const fitClass = fit === 'contain' ? 'object-contain p-3' : 'object-cover';

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h3>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ImagePlus />}
              loading={upload.isPending}
              disabled={busy}
              blockedReason={blockedReason}
              onClick={() => fileInput.current?.click()}
            >
              {hasPhoto ? 'Reemplazar' : 'Subir foto'}
            </Button>
            {hasPhoto && photoRemovable(kind) && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 />}
                loading={remove.isPending}
                disabled={busy}
                blockedReason={blockedReason}
                onClick={() => void handleRemove()}
              >
                Quitar
              </Button>
            )}
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={PHOTO_ALLOWED_TYPES.join(',')}
          className="hidden"
          aria-label={`Elegir la foto ${subject}`}
          onChange={handleFile}
        />
      </div>
      {photo.failed ? (
        <div className="rounded-xl border border-dashed border-outline p-4 text-center" role="alert">
          <p className="text-sm text-danger">No se pudo cargar la foto.</p>
          <Button variant="secondary" size="sm" className="mt-2" loading={photo.renewing} onClick={photo.retry}>
            Reintentar
          </Button>
        </div>
      ) : photo.src ? (
        <button
          type="button"
          onClick={openZoom}
          className="group relative block w-full overflow-hidden rounded-xl border border-outline bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={`Ampliar la foto ${subject}`}
        >
          <img
            src={photo.src}
            alt={`Foto ${subject}`}
            className={cx('h-40 w-full', fitClass)}
            onError={photo.handleError}
          />
          <span className="absolute bottom-2 right-2 rounded-lg bg-surface/90 p-1.5 text-ink shadow">
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      ) : (
        <p className="rounded-xl border border-dashed border-outline p-4 text-center text-sm text-muted">Sin foto</p>
      )}
      {canEdit && blockedReason && <p className="mt-1 text-xs text-muted">{blockedReason}</p>}
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
