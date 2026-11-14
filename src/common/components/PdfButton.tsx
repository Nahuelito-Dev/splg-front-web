import { FileText } from 'lucide-react';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import type { PdfRequest } from '../../services/api/pdfs';
import { Button } from './ui';

interface Props {
  request: PdfRequest;
  /** Texto del botón; por defecto «PDF». */
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  /** Por qué hoy no se puede bajar (queda apagado, con el motivo en el tooltip). */
  blockedReason?: string;
}

/** Botón que abre un PDF del back: muestra que está cargando y avisa el error real si falla. */
export const PdfButton = ({ request, label = 'PDF', variant = 'secondary', size, blockedReason }: Props) => {
  const { download, pending, blockedReason: scopeReason } = usePdfDownload();
  return (
    <Button
      variant={variant}
      size={size}
      icon={<FileText />}
      loading={pending}
      blockedReason={blockedReason ?? scopeReason}
      onClick={() => download(request)}
    >
      {label}
    </Button>
  );
};
