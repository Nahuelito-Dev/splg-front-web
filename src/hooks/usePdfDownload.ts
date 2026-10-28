import type { PdfRequest } from '../services/api/pdfs';
import { useDownloadPdf } from '../services/queries/pdfs';
import { openFileSource, saveFileSource } from '../utils/fileSource';
import { notify } from '../utils/notifications';

/**
 * Pide el PDF al back y lo abre en una pestaña nueva; si el navegador la bloquea, lo baja. El error real del
 * back (p. ej. «el pedido no está pagado») sale como aviso.
 */
export const usePdfDownload = () => {
  const { mutate, isPending } = useDownloadPdf();
  const download = (request: PdfRequest) => {
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
  return { download, pending: isPending };
};
