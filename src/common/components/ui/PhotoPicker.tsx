import { useEffect, useState } from 'react';
import type { PhotoKind } from '../../../services/api/photos';
import { notify } from '../../../utils/notifications';
import { photoFileError, photoLimitsText } from '../../../utils/photos';
import { ImageInput } from './ImageInput';

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
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreview(null);
    };
  }, [file]);

  const reject = (message: string) => {
    setError(message);
    notify.error(new Error(message));
  };

  const handleFile = (picked: File) => {
    const invalid = photoFileError(kind, picked);
    if (invalid) {
      reject(invalid);
      return;
    }
    setError(null);
    onChange(picked);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <ImageInput
        inputLabel="Elegir la foto"
        subject="elegida"
        src={file ? preview : null}
        hint={photoLimitsText(kind)}
        caption={file?.name}
        error={error}
        onFile={handleFile}
        onReject={reject}
        onRemove={() => {
          setError(null);
          onChange(null);
        }}
      />
    </div>
  );
};
