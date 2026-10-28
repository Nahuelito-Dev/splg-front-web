import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { ImagePlus, Maximize2, Trash2, UploadCloud } from 'lucide-react';
import { PHOTO_ALLOWED_TYPES } from '../../../services/api/photos';
import { Button } from './Button';
import { cx } from './cx';

interface Props {
  /** Texto del `<input type="file">` (lo que lee el lector de pantalla y los tests). */
  inputLabel: string;
  /** Qué foto es, para los textos accesibles: «del vehículo», «de perfil»… */
  subject: string;
  /** La imagen a mostrar (URL firmada o vista previa local); sin ella se dibuja el estado vacío. */
  src?: string | null;
  /** La imagen no cargó: se muestra el aviso con «Reintentar» y, si se puede editar, las acciones igual. */
  broken?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
  /** Formatos y tamaño máximo, tal como los valida la app. */
  hint: string;
  /** Recibe el archivo elegido o soltado; la validación la hace quien lo recibe. */
  onFile: (file: File) => void;
  /** Avisa por qué se descartó una selección (varios archivos, zona bloqueada, subida en curso). */
  onReject?: (message: string) => void;
  onRemove?: () => void;
  onZoom?: () => void;
  onImageError?: () => void;
  /** Si se puede cambiar. Sin permiso se ve la imagen (o «Sin foto») y ninguna acción. */
  canEdit?: boolean;
  /** Por qué no se puede cambiar ahora; apaga las acciones y lo explica. */
  blockedReason?: string;
  /** Subiendo o quitando: overlay con spinner y todo lo demás apagado. */
  busy?: boolean;
  busyLabel?: string;
  /** Error de validación o de subida, visible junto al componente. */
  error?: string | null;
  /** Logos: se ven enteros, sin recortar. */
  fit?: 'cover' | 'contain';
  /** Texto bajo la imagen (p. ej. el nombre del archivo elegido). */
  caption?: ReactNode;
  className?: string;
}

const RATIO = 'aspect-[16/10] w-full';

/**
 * Imagen de un registro o de un alta: vista previa con la proporción del kit, estado vacío que invita a arrastrar o
 * elegir, arrastrar y soltar también sobre una imagen existente, y reemplazar / ampliar / quitar. Es sólo
 * presentación: quien lo usa decide qué hacer con el archivo. Las acciones aparecen al pasar el mouse en
 * escritorio y quedan siempre visibles en pantallas chicas o táctiles.
 */
export const ImageInput = ({
  inputLabel,
  subject,
  src,
  broken = false,
  onRetry,
  retrying = false,
  hint,
  onFile,
  onReject,
  onRemove,
  onZoom,
  onImageError,
  canEdit = true,
  blockedReason,
  busy = false,
  busyLabel = 'Subiendo…',
  error,
  fit = 'cover',
  caption,
  className,
}: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const blocked = Boolean(blockedReason);
  const accepts = canEdit && !blocked && !busy;

  /** Descarta un archivo que llegó con la zona apagada y lo dice (si no se puede editar no hay nada que decir). */
  const refuse = () => {
    if (!canEdit) return;
    onReject?.(blockedReason ?? 'Esperá a que termine la operación en curso.');
  };
  const receive = (file: File) => {
    if (!accepts) {
      refuse();
      return;
    }
    onFile(file);
  };
  const pick = () => {
    if (accepts) input.current?.click();
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;
    if (!accepts) {
      refuse();
      return;
    }
    if (files.length > 1) {
      onReject?.('Soltá un solo archivo por vez.');
      return;
    }
    onFile(files[0]);
  };

  const frame = 'relative w-full overflow-hidden rounded-card border bg-bg shadow-card';
  const stateClass = dragging ? 'border-primary bg-primary-soft' : 'border-outline';
  const showImage = Boolean(src) && !broken;
  const hasActions = canEdit || (onZoom && showImage);

  const actions = hasActions && (
    <div
      className={cx(
        'flex flex-wrap justify-center gap-2 border-t border-outline bg-surface p-2',
        showImage &&
          cx(
            'sm:pointer-hover:absolute sm:pointer-hover:inset-x-0 sm:pointer-hover:bottom-0 sm:pointer-hover:border-0',
            'sm:pointer-hover:bg-transparent sm:pointer-hover:bg-gradient-to-t sm:pointer-hover:from-side/80',
            'sm:pointer-hover:to-transparent sm:pointer-hover:px-3 sm:pointer-hover:pb-3 sm:pointer-hover:pt-10',
            'sm:pointer-hover:opacity-0 sm:pointer-hover:transition sm:pointer-hover:focus-within:opacity-100',
            'sm:pointer-hover:group-hover:opacity-100',
          ),
      )}
    >
      {canEdit && (
        <Button
          variant="secondary"
          size="sm"
          icon={<ImagePlus />}
          disabled={busy}
          blockedReason={blockedReason}
          onClick={pick}
        >
          Reemplazar
        </Button>
      )}
      {onZoom && showImage && (
        <Button
          variant="secondary"
          size="sm"
          icon={<Maximize2 />}
          disabled={busy}
          aria-label={`Ampliar la foto ${subject}`}
          onClick={onZoom}
        >
          Ampliar
        </Button>
      )}
      {canEdit && onRemove && (
        <Button
          variant="secondary"
          size="sm"
          icon={<Trash2 />}
          disabled={busy}
          blockedReason={blockedReason}
          onClick={onRemove}
        >
          Quitar
        </Button>
      )}
    </div>
  );

  return (
    <div className={cx('w-full max-w-md', className)}>
      <div
        data-dragging={dragging || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          if (accepts) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="group relative"
      >
        {canEdit && (
          <input
            ref={input}
            type="file"
            accept={PHOTO_ALLOWED_TYPES.join(',')}
            className="sr-only"
            aria-label={inputLabel}
            aria-hidden="true"
            tabIndex={-1}
            disabled={!accepts}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) receive(file);
            }}
          />
        )}
        {showImage ? (
          <div className={cx(frame, stateClass)}>
            {/* Tocar la imagen la amplía; el botón «Ampliar» de las acciones es la vía con teclado y lector. */}
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              disabled={!onZoom}
              onClick={onZoom}
              className={cx('block', RATIO, onZoom ? 'cursor-zoom-in' : 'cursor-default')}
            >
              <img
                src={src ?? undefined}
                alt={`Foto ${subject}`}
                className={cx('h-full w-full', fit === 'contain' ? 'object-contain p-3' : 'object-cover')}
                onError={onImageError}
              />
            </button>
            {actions}
          </div>
        ) : broken ? (
          <div className={cx(frame, 'border-dashed', stateClass)}>
            <div className={cx(RATIO, 'flex flex-col items-center justify-center gap-2 p-4 text-center')} role="alert">
              <p className="text-sm text-danger">No se pudo cargar la foto.</p>
              <Button variant="secondary" size="sm" loading={retrying} onClick={onRetry}>
                Reintentar
              </Button>
            </div>
            {actions}
          </div>
        ) : canEdit ? (
          <button
            type="button"
            onClick={pick}
            aria-disabled={!accepts || undefined}
            disabled={busy}
            className={cx(
              frame,
              RATIO,
              'flex flex-col items-center justify-center gap-2 border-2 border-dashed px-4 text-center transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
              dragging
                ? 'border-primary bg-primary-soft'
                : 'border-outline hover:border-primary hover:bg-surface-hover',
              !accepts ? 'cursor-not-allowed opacity-60 hover:border-outline hover:bg-bg' : 'cursor-pointer',
            )}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
              <UploadCloud className="h-5 w-5" aria-hidden="true" />
            </span>
            {blocked ? (
              <span className="text-sm font-medium text-warn">{blockedReason}</span>
            ) : (
              <>
                <span className="text-sm font-medium text-ink">
                  {dragging ? 'Soltá la imagen para subirla' : 'Arrastrá una imagen o hacé clic para elegirla'}
                </span>
                <span className="text-xs text-muted">{hint}</span>
              </>
            )}
          </button>
        ) : (
          <p
            className={cx(
              frame,
              RATIO,
              'flex items-center justify-center border-dashed text-sm text-muted',
              stateClass,
            )}
          >
            Sin foto
          </p>
        )}
        <div
          role="status"
          className={cx(
            'absolute inset-0 flex items-center justify-center gap-2 rounded-card bg-surface/75 text-sm font-medium text-ink',
            !busy && 'pointer-events-none opacity-0',
          )}
        >
          {busy && (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden="true"
              />
              {busyLabel}
            </>
          )}
        </div>
      </div>
      {caption && <p className="mt-1.5 truncate text-xs text-muted">{caption}</p>}
      {canEdit && blockedReason && (showImage || broken) && (
        <p className="mt-1.5 text-xs font-medium text-warn">{blockedReason}</p>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
};
