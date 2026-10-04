import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Maximize2 } from 'lucide-react';
import { Button, Modal, Skeleton } from '../../../common/components/ui';
import { useFileSourceUrl } from '../../../hooks/useFileSourceUrl';
import { toApiError } from '../../../services/api/errors';
import type { Claim } from '../../../services/api/types';
import { useClaimPhoto, useUploadClaimPhoto } from '../../../services/queries/claims';
import { notify } from '../../../utils/notifications';
import { CLAIM_PHOTO_ALLOWED_TYPES, claimPhotoError, claimPhotoUploadMessage } from './claimPhotoValidation';

interface Props {
  claim: Claim;
  open: boolean;
  /** Puede operar la distribuidora activa (sin ella la API no deja subir). */
  canOperate: boolean;
  operateHint?: string;
}

/**
 * Foto del reclamo: miniatura que se amplía, y subir o reemplazar. La URL se pide al abrir el reclamo (vence en
 * minutos). Un reclamo resuelto o rechazado no admite foto nueva: se reabre antes.
 */
export const ClaimPhoto = ({ claim, open, canOperate, operateHint }: Props) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const photo = useClaimPhoto(claim.claim_id, open);
  const src = useFileSourceUrl(photo.data);
  const upload = useUploadClaimPhoto();
  // La URL firmada pudo vencer entre que se pidió y se pintó: si el <img> falla se pide de nuevo, una vez.
  const [retried, setRetried] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setRetried(false);
    setImageFailed(false);
  }, [claim.claim_id]);
  const handleImageError = () => {
    if (retried) {
      setImageFailed(true);
      return;
    }
    setRetried(true);
    void photo.refetch();
  };
  const loadFailed = Boolean(photo.error) || imageFailed;
  const retry = () => {
    setRetried(false);
    setImageFailed(false);
    void photo.refetch();
  };
  const closed = claim.status === 'resolved' || claim.status === 'rejected';
  const hasPhoto = Boolean(photo.data);
  const blockedReason = closed ? 'El reclamo está cerrado: reabrilo para cambiar la foto' : operateHint;

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const invalid = claimPhotoError(file);
    if (invalid) {
      notify.error(new Error(invalid));
      return;
    }
    upload.mutate(
      { id: claim.claim_id, file },
      {
        onSuccess: () => notify.success(hasPhoto ? 'Foto reemplazada' : 'Foto subida'),
        onError: (error) => {
          const apiError = toApiError(error);
          notify.error(new Error(claimPhotoUploadMessage(apiError.status, apiError.message)));
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Foto</h3>
        {!loadFailed && !photo.isPending && (
          <Button
            variant="secondary"
            size="sm"
            icon={<ImagePlus />}
            disabled={closed || !canOperate}
            title={blockedReason}
            loading={upload.isPending}
            onClick={() => fileInput.current?.click()}
          >
            {hasPhoto ? 'Reemplazar foto' : 'Subir foto'}
          </Button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={CLAIM_PHOTO_ALLOWED_TYPES.join(',')}
          className="hidden"
          aria-label="Elegir la foto del reclamo"
          onChange={handleFile}
        />
      </div>
      {photo.isPending && open ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : loadFailed ? (
        <div className="rounded-xl border border-dashed border-outline p-4 text-center" role="alert">
          <p className="text-sm text-danger">
            No se pudo cargar la foto.{photo.error ? ` ${toApiError(photo.error).message}` : ''}
          </p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={retry}>
            Reintentar
          </Button>
        </div>
      ) : src ? (
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="group relative block w-full overflow-hidden rounded-xl border border-outline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Ampliar la foto del reclamo"
        >
          <img src={src} alt="Evidencia del reclamo" className="h-40 w-full object-cover" onError={handleImageError} />
          <span className="absolute bottom-2 right-2 rounded-lg bg-surface/90 p-1.5 text-ink shadow">
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      ) : (
        <p className="rounded-xl border border-dashed border-outline p-4 text-center text-sm text-muted">
          Sin foto adjunta
        </p>
      )}
      {closed && <p className="mt-1 text-xs text-muted">Reabrí el reclamo para subir o cambiar la foto.</p>}
      <Modal open={zoomed && Boolean(src)} onClose={() => setZoomed(false)} title="Foto del reclamo" size="lg">
        {src && <img src={src} alt="Evidencia del reclamo, ampliada" className="mx-auto max-h-[60vh] rounded-lg" />}
      </Modal>
    </div>
  );
};
