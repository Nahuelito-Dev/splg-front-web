import { File, FileImage, FileText, type LucideIcon } from 'lucide-react';

/** El ícono según el `mimeType` del adjunto (PDF, imagen o genérico). */
export const fleetAttachmentIcon = (mimeType: string): LucideIcon => {
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.startsWith('image/')) return FileImage;
  return File;
};

/** "245 KB" / "2.3 MB": el tamaño de un adjunto en la unidad que corresponda. */
export const formatAttachmentSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
