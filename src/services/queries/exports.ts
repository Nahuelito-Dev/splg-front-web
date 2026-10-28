import { useMutation } from '@tanstack/react-query';
import { downloadExport, type ExportFormat, type ExportParams, type ExportResource } from '../api/exports';

interface ExportRequest {
  resource: ExportResource;
  format: ExportFormat;
  params?: ExportParams;
}

/** Baja un exporte completo del back. No toca la caché: es una descarga. */
export const useDownloadExport = () =>
  useMutation({
    mutationFn: ({ resource, format, params }: ExportRequest) => downloadExport(resource, format, params),
  });
