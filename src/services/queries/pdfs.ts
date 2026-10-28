import { useMutation } from '@tanstack/react-query';
import { downloadPdf, type PdfRequest } from '../api/pdfs';

/** Baja un PDF generado en el back. No toca la caché: es una descarga. */
export const useDownloadPdf = () => useMutation({ mutationFn: (request: PdfRequest) => downloadPdf(request) });
