import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { cx } from './cx';
import { EmptyIllustration } from './EmptyIllustration';

interface Props {
  /** Texto del `<input type="file">` oculto (lo que lee el lector de pantalla y los tests). */
  inputLabel: string;
  /** MIME aceptados: filtran el selector del sistema; la validación fina la hace quien recibe el archivo. */
  accept: string[];
  onFile: (file: File) => void;
  /** Avisa por qué se descartó una selección (p. ej. varios archivos soltados juntos). */
  onReject?: (message: string) => void;
  /** Formatos aceptados y tamaño máximo, tal como los valida la app. */
  hint: string;
  title?: string;
  loading?: boolean;
  /** Por qué no se puede subir ahora; apaga la zona y lo explica. */
  blockedReason?: string;
  className?: string;
}

/** Zona para soltar o elegir un archivo: se activa con clic, Enter o espacio y resalta mientras se arrastra encima. */
export const DropZone = ({
  inputLabel,
  accept,
  onFile,
  onReject,
  hint,
  title = 'Soltá el archivo acá o elegilo',
  loading = false,
  blockedReason,
  className,
}: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const off = loading || Boolean(blockedReason);

  const open = () => {
    if (!off) input.current?.click();
  };
  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (off) return;
    const files = event.dataTransfer.files;
    if (files && files.length > 1) {
      onReject?.('Soltá un solo archivo por vez.');
      return;
    }
    if (files?.[0]) onFile(files[0]);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={off || undefined}
      aria-busy={loading || undefined}
      aria-description={blockedReason}
      data-dragging={dragging || undefined}
      onClick={open}
      onKeyDown={handleKey}
      onDragOver={(event) => {
        event.preventDefault();
        if (!off) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cx(
        'flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-3 text-center transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
        dragging
          ? 'border-primary bg-primary-soft'
          : 'border-outline bg-bg hover:border-primary hover:bg-surface-hover',
        off ? 'cursor-not-allowed opacity-50 hover:border-outline hover:bg-bg' : 'cursor-pointer',
        className,
      )}
    >
      <input
        ref={input}
        type="file"
        accept={accept.join(',')}
        className="hidden"
        aria-label={inputLabel}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onFile(file);
        }}
      />
      <EmptyIllustration className="h-14 w-[70px]" />
      <p className="text-sm font-medium text-ink">{loading ? 'Subiendo…' : title}</p>
      {blockedReason ? (
        <p className="text-xs font-medium text-warn">{blockedReason}</p>
      ) : (
        <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
};
