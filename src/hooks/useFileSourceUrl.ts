import { useEffect, useState } from 'react';
import type { FileSource } from '../services/api/fileSource';

/**
 * Una URL para un `<img>` o un enlace a partir de un `FileSource`: la firmada se usa tal cual; un blob se publica
 * con `URL.createObjectURL` y se libera al cambiar o desmontar.
 */
export const useFileSourceUrl = (source: FileSource | null | undefined): string | null => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const blob = source?.kind === 'blob' ? source.blob : null;
  useEffect(() => {
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [blob]);
  return source?.kind === 'url' ? source.url : objectUrl;
};
