import { errorMessage } from '../services/api/errors';

export interface BatchFailure {
  id: string;
  message: string;
}

export interface BatchResult {
  done: string[];
  /** Filas que ya no aplicaban al momento de procesarlas (cambiaron de estado): no son fallas. */
  skipped: string[];
  failed: BatchFailure[];
  /** Filas que no se llegaron a procesar porque se detuvo el lote. */
  notRun: string[];
}

/** Lo que una tarea devuelve para avisar que la fila ya no aplica y no hay que tocarla. */
export const SKIP = 'skip' as const;

/**
 * Corre una acción por cada id, de a una (la API no tiene endpoints en lote) y sin cortar en la primera falla:
 * al final se sabe qué salió, qué se omitió y qué no. Con `signal` abortada no lanza las que faltan.
 */
export const runBatch = async (
  ids: string[],
  task: (id: string) => Promise<unknown>,
  signal?: AbortSignal,
): Promise<BatchResult> => {
  const result: BatchResult = { done: [], skipped: [], failed: [], notRun: [] };
  for (const id of ids) {
    if (signal?.aborted) {
      result.notRun.push(id);
      continue;
    }
    try {
      if ((await task(id)) === SKIP) result.skipped.push(id);
      else result.done.push(id);
    } catch (error) {
      result.failed.push({ id, message: errorMessage(error) });
    }
  }
  return result;
};

/** "1 de 2 pedidos cancelados. 1 omitido. Fallaron 1." — el resumen que se le muestra a quien lo pidió. */
export const batchSummary = (
  { done, skipped, failed, notRun }: BatchResult,
  noun: [singular: string, plural: string],
  participle: [singular: string, plural: string],
): string => {
  const total = done.length + skipped.length + failed.length + notRun.length;
  const plain = done.length === total;
  const one = plain ? done.length === 1 : total === 1;
  const head = plain
    ? `${done.length} ${noun[one ? 0 : 1]} ${participle[one ? 0 : 1]}`
    : `${done.length} de ${total} ${noun[one ? 0 : 1]} ${participle[one ? 0 : 1]}`;
  const parts = [head];
  if (skipped.length > 0)
    parts.push(`${skipped.length} ${skipped.length === 1 ? 'omitido (ya no aplicaba)' : 'omitidos (ya no aplicaban)'}`);
  if (notRun.length > 0) parts.push(`Detenido: ${notRun.length} sin procesar`);
  if (failed.length > 0) parts.push(`Fallaron ${failed.length}`);
  return `${parts.join('. ')}.`;
};

/** Quita del resumen lo que no hace falta mostrar en verde: hubo fallas, o no todo se procesó. */
export const batchHasProblems = ({ failed, notRun }: BatchResult): boolean => failed.length > 0 || notRun.length > 0;
