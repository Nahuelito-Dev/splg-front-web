import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PHOTO_ALLOWED_TYPES, type PhotoKind } from '../../../services/api/photos';
import { notify } from '../../../utils/notifications';
import { photoFileError, photoLimitsText } from '../../../utils/photos';
import { Button } from './Button';
import { DropZone } from './DropZone';

interface Props {
  kind: PhotoKind;
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
}

/**
 * Elegir una foto antes de crear el registro: se valida tipo y tamaño para avisar rápido (la validación real es la
 * del back) y se muestra una vista previa local. La foto se sube recién cuando el registro existe.
 */
export const PhotoPicker = ({ kind, file, onChange, label = 'Foto (opcional)' }: Props) => {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreview(null);
    };
  }, [file]);

  const handleFile = (picked: File) => {
    const invalid = photoFileError(kind, picked);
    if (invalid) {
      notify.error(new Error(invalid));
      return;
    }
    onChange(picked);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {file && preview ? (
        <div className="flex items-center gap-3 rounded-xl border border-outline p-2">
          <img src={preview} alt="Vista previa de la foto elegida" className="h-16 w-16 rounded-lg object-cover" />
          <span className="min-w-0 flex-1 truncate text-sm text-ink">{file.name}</span>
          <Button variant="ghost" size="sm" icon={<X />} onClick={() => onChange(null)}>
            Quitar
          </Button>
        </div>
      ) : (
        <DropZone
          inputLabel="Elegir la foto"
          accept={PHOTO_ALLOWED_TYPES}
          onFile={handleFile}
          onReject={(message) => notify.error(new Error(message))}
          title="Soltá la foto acá o elegila"
          hint={photoLimitsText(kind)}
        />
      )}
    </div>
  );
};
