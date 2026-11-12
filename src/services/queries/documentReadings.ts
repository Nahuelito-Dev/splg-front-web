import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmDocumentReading,
  correctDocumentReading,
  getDocumentReading,
  getDocumentReadingSpend,
  listDocumentReadings,
  rejectDocumentReading,
  runDocumentReadings,
  type DocumentReadingFilters,
} from '../api/documentReadings';
import { toApiError } from '../api/errors';
import type { ListParams } from '../api/stock';
import type {
  ConfirmDocumentReadingBody,
  CorrectDocumentReadingBody,
  DocumentReading,
  RejectDocumentReadingBody,
} from '../api/types';
import { DOCUMENT_READING_STATUS, statusKeys } from '../../utils/statusLabels';
import { refreshFinance, runMoney } from './finance';
import { queryKeys } from './queryKeys';
import { useStatusCounts } from './statusCounts';

const keys = queryKeys.documentReadings;

interface Options {
  enabled?: boolean;
}

export const useDocumentReadings = (
  params: ListParams,
  filters: DocumentReadingFilters = {},
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: keys.list({ ...params, ...filters }),
    queryFn: () => listDocumentReadings(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Cuántas lecturas hay en cada estado, con el filtro de tipo aplicado. */
export const useDocumentReadingStatusCounts = (filters: Omit<DocumentReadingFilters, 'status'>, enabled = true) =>
  useStatusCounts(
    statusKeys(DOCUMENT_READING_STATUS),
    (status) => keys.list({ ...filters, counts: status }),
    (status) => listDocumentReadings({ page: 0, pageSize: 1 }, { ...filters, status }).then((page) => page.total),
    enabled,
  );

export const useDocumentReading = (id: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getDocumentReading(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

/** Gasto del mes en lecturas y si el servicio de lectura está configurado. */
export const useDocumentReadingSpend = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('spend'), queryFn: getDocumentReadingSpend, enabled });

/** Cuenta cuántos documentos leería ahora (no lee ni gasta nada, así que no refresca nada). */
export const useSimulateDocumentReadings = () =>
  useMutation({ mutationFn: () => runDocumentReadings({ dryRun: true }) });

/** Lee los pendientes ahora: cambia la lista y el gasto. */
export const useRunDocumentReadings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runDocumentReadings({ dryRun: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Lo que una decisión puede tocar además de la lectura: la cuota, la multa, la póliza, el legajo o la recepción. */
const OWNER_KEYS = [
  queryKeys.insurance.all,
  queryKeys.trafficFines.all,
  queryKeys.fleet.all,
  queryKeys.employees.all,
  queryKeys.purchaseReceipts.all,
  // La factura leída escribe el número en la recepción, que también se ve en su orden y en el historial del proveedor.
  queryKeys.purchaseOrders.all,
  queryKeys.suppliers.all,
  queryKeys.cars.all,
];

/**
 * Una decisión sobre una propuesta, con su clave de idempotencia (confirmar o corregir un pago mueve una caja). Al
 * terminar bien se refresca la lectura, lo que pudo cambiar en su dueño y finanzas. Un 409 (ya resuelta, cambió) deja
 * la lectura desactualizada: se vuelve a pedir para que la pantalla muestre su estado real.
 */
const useDecision = <B>(kind: string, call: (id: string, body: B, key: string) => Promise<DocumentReading>) => {
  const queryClient = useQueryClient();
  const refreshReading = () => queryClient.invalidateQueries({ queryKey: keys.all });
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: B }) =>
      runMoney(queryClient, `document-reading:${kind}:${id}`, body, (key) => call(id, body, key)),
    onSuccess: async () => {
      await Promise.all([
        refreshReading(),
        refreshFinance(queryClient),
        ...OWNER_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ]);
    },
    onError: (error) => {
      if (toApiError(error).status === 409) void refreshReading();
    },
  });
};

export const useConfirmDocumentReading = () =>
  useDecision<ConfirmDocumentReadingBody>('confirm', confirmDocumentReading);

export const useCorrectDocumentReading = () =>
  useDecision<CorrectDocumentReadingBody>('correct', correctDocumentReading);

export const useRejectDocumentReading = () => useDecision<RejectDocumentReadingBody>('reject', rejectDocumentReading);
