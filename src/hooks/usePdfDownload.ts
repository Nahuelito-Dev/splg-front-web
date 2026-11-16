import type { PdfRequest } from '../services/api/pdfs';
import { useDownloadPdf } from '../services/queries/pdfs';
import { openFileSource, saveFileSource } from '../utils/fileSource';
import { notify } from '../utils/notifications';
import { useSupportScopeHint } from './useSupportSession';

/**
 * Pide el PDF al back y lo abre en una pestaña nueva; si el navegador la bloquea, lo baja. El error real del
 * back (p. ej. «el pedido no está pagado») sale como aviso.
 */
export const usePdfDownload = () => {
  const { mutate, isPending } = useDownloadPdf();
  const exportHint = useSupportScopeHint('exports');
  const download = (request: PdfRequest) => {
    // En modo soporte sin el alcance «exportes» la API responde 403 SUPPORT_SCOPE_REQUIRED: ni se pide.
    if (exportHint) {
      notify.warn(exportHint);
      return;
    }
    if (isPending) {
      notify.info('Esperá a que termine el PDF anterior');
      return;
    }
    mutate(request, {
      onSuccess: ({ blob, filename }) => {
        const source = { kind: 'blob', blob } as const;
        if (!openFileSource(source)) saveFileSource(source, filename);
      },
      onError: (error) => notify.error(error),
    });
  };
  return { download, pending: isPending, blockedReason: exportHint };
};
