import { Download, Sheet } from 'lucide-react';
import type { MenuAction } from '../common/components/ui/MoreActionsMenu';
import type { ExportFormat, ExportParams, ExportResource } from '../services/api/exports';
import { useDownloadExport } from '../services/queries/exports';
import { notify } from '../utils/notifications';
import { saveFileSource } from '../utils/fileSource';
import { usePermissions } from './usePermissions';

export interface ServerExport {
  resource: ExportResource;
  /** Los mismos filtros que usa el listado. */
  params?: ExportParams;
  /** Por qué no se puede exportar ahora (p. ej. falta elegir la caja). */
  blockedReason?: string;
}

/**
 * Las acciones «Exportar CSV» y «Exportar Excel» del menú «Más»: bajan del back todas las filas
 * que cumplen los filtros, no sólo la página que se ve.
 */
export const useServerExport = (config: ServerExport | undefined): MenuAction[] => {
  const descarga = useDownloadExport();
  const { exportHint } = usePermissions();
  const NOMBRE: Record<ExportFormat, string> = { csv: 'CSV', xlsx: 'Excel' };
  if (!config) return [];

  const exportar = (format: ExportFormat) => {
    notify.info(`Preparando el ${NOMBRE[format]}…`);
    descarga.mutate(
      { resource: config.resource, format, params: config.params },
      {
        onSuccess: ({ blob, filename, total }) => {
          saveFileSource({ kind: 'blob', blob }, filename);
          notify.success(total === 1 ? 'Se exportó 1 fila' : `Se exportaron ${total} filas`);
        },
        onError: (error) => notify.error(error),
      },
    );
  };

  const ocupado = descarga.isPending ? 'Ya se está preparando un exporte' : undefined;
  return [
    {
      label: 'Exportar CSV',
      icon: <Download />,
      onClick: () => exportar('csv'),
      blockedReason: config.blockedReason ?? exportHint ?? ocupado,
    },
    {
      label: 'Exportar Excel',
      icon: <Sheet />,
      onClick: () => exportar('xlsx'),
      blockedReason: config.blockedReason ?? exportHint ?? ocupado,
    },
  ];
};
