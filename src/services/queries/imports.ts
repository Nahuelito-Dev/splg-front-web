import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  confirmImport,
  downloadImportTemplate,
  previewImport,
  type ImportFormat,
  type ImportResource,
} from '../api/imports';
import { queryKeys } from './queryKeys';
import { invalidateStockViews } from './stock';

/** Qué listados cambian al confirmar cada recurso. */
/** Lo que refresca cada recurso. Garrafas (con stock inicial) y stock mueven el libro de stock: todas sus vistas. */
const AFFECTED: Record<ImportResource, (queryClient: QueryClient) => Promise<unknown>> = {
  garrafas: invalidateStockViews,
  precios: (queryClient) => queryClient.invalidateQueries({ queryKey: queryKeys.gasCylinders.all }),
  stock: invalidateStockViews,
  proveedores: (queryClient) => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
};

/** Baja la plantilla de un recurso. No toca la caché: es una descarga. */
export const useDownloadImportTemplate = () =>
  useMutation({
    mutationFn: ({ resource, format }: { resource: ImportResource; format: ImportFormat }) =>
      downloadImportTemplate(resource, format),
  });

/** Sube el archivo y devuelve la vista previa. No aplica nada. */
export const usePreviewImport = () =>
  useMutation({
    mutationFn: ({ resource, file }: { resource: ImportResource; file: File }) => previewImport(resource, file),
  });

/** Confirma la importación y refresca lo que cambió. */
export const useConfirmImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (importId: string) => confirmImport(importId),
    onSuccess: async ({ recurso }) => {
      await AFFECTED[recurso](queryClient);
    },
  });
};
