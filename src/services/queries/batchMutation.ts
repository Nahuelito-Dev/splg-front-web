import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useRef } from 'react';
import { batchHasProblems, batchSummary, runBatch, type BatchResult } from '../../utils/batch';
import { notify } from '../../utils/notifications';

interface Options<V extends { ids: string[] }> {
  /** Procesa una fila; devuelve `SKIP` si ya no aplica. Corre de a una, con la señal de "Detener". */
  run: (vars: V, id: string) => Promise<unknown>;
  invalidate: QueryKey;
  noun: [singular: string, plural: string];
  participle: [singular: string, plural: string];
}

/**
 * Una acción en lote como mutación: el resumen (éxitos, omitidas, fallas) se avisa desde acá, no desde quien la
 * dispara, así aparece aunque se haya navegado a otra pantalla. `stop()` evita lanzar las filas que faltan.
 */
export const useBatchMutation = <V extends { ids: string[] }>({ run, invalidate, noun, participle }: Options<V>) => {
  const queryClient = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  const mutation = useMutation<BatchResult, unknown, V>({
    mutationFn: (vars) => {
      controller.current = new AbortController();
      return runBatch(vars.ids, (id) => run(vars, id), controller.current.signal);
    },
    onSuccess: (result) => {
      const summary = batchSummary(result, noun, participle);
      if (batchHasProblems(result)) {
        const first = result.failed[0];
        notify.error(new Error(first ? `${summary} ${first.message}` : summary));
      } else notify.success(summary);
    },
    onError: notify.error,
    onSettled: () => queryClient.invalidateQueries({ queryKey: invalidate }),
  });
  return { ...mutation, stop: () => controller.current?.abort() };
};
