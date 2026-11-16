import { describe, expect, it, vi } from 'vitest';
import { SKIP, batchHasProblems, batchSummary, runBatch } from './batch';

describe('runBatch', () => {
  it('corre todos los ids aunque alguno falle y separa éxitos de fallas', async () => {
    const task = vi.fn((id: string) =>
      id === 'b' ? Promise.reject(new Error('Transición inválida')) : Promise.resolve(),
    );
    const result = await runBatch(['a', 'b', 'c'], task);
    expect(task).toHaveBeenCalledTimes(3);
    expect(result.done).toEqual(['a', 'c']);
    expect(result.failed).toEqual([{ id: 'b', message: 'Transición inválida' }]);
  });

  it('una tarea que devuelve SKIP cuenta como omitida, no como falla ni como hecha', async () => {
    const result = await runBatch(['a', 'b'], (id) => Promise.resolve(id === 'a' ? SKIP : undefined));
    expect(result).toMatchObject({ done: ['b'], skipped: ['a'], failed: [] });
  });

  it('corre de a uno, en orden', async () => {
    const order: string[] = [];
    let running = 0;
    let maxRunning = 0;
    await runBatch(['1', '2', '3'], async (id) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await Promise.resolve();
      order.push(id);
      running -= 1;
    });
    expect(order).toEqual(['1', '2', '3']);
    expect(maxRunning).toBe(1);
  });

  it('con la señal abortada no lanza las que faltan y las informa como sin procesar', async () => {
    const controller = new AbortController();
    const task = vi.fn((id: string) => {
      if (id === '1') controller.abort();
      return Promise.resolve();
    });
    const result = await runBatch(['1', '2', '3'], task, controller.signal);
    expect(task).toHaveBeenCalledTimes(1);
    expect(result.done).toEqual(['1']);
    expect(result.notRun).toEqual(['2', '3']);
    expect(batchHasProblems(result)).toBe(true);
  });

  it('sin ids no llama a nada', async () => {
    const task = vi.fn();
    expect(await runBatch([], task)).toEqual({ done: [], skipped: [], failed: [], notRun: [] });
    expect(task).not.toHaveBeenCalled();
  });
});

describe('batchSummary', () => {
  const noun: [string, string] = ['pedido', 'pedidos'];
  const participle: [string, string] = ['cancelado', 'cancelados'];
  const r = (done: string[], extra: Partial<Parameters<typeof batchSummary>[0]> = {}) =>
    batchSummary({ done, skipped: [], failed: [], notRun: [], ...extra }, noun, participle);

  it('todo bien: cuenta los hechos', () => {
    expect(r(['a'])).toBe('1 pedido cancelado.');
    expect(r(['a', 'b'])).toBe('2 pedidos cancelados.');
  });

  it('con fallas: "X de N" y cuántas fallaron', () => {
    expect(r(['a', 'b'], { failed: [{ id: 'c', message: 'x' }] })).toBe('2 de 3 pedidos cancelados. Fallaron 1.');
    expect(r(['a'], { failed: [{ id: 'b', message: 'x' }] })).toBe('1 de 2 pedidos cancelados. Fallaron 1.');
    expect(r([], { failed: [{ id: 'a', message: 'x' }] })).toBe('0 de 1 pedido cancelado. Fallaron 1.');
  });

  it('las omitidas se cuentan aparte de las fallas, y lo detenido se avisa', () => {
    expect(r(['a'], { skipped: ['b'] })).toBe('1 de 2 pedidos cancelados. 1 omitido (ya no aplicaba).');
    expect(r(['a'], { skipped: ['b', 'c'], notRun: ['d'] })).toBe(
      '1 de 4 pedidos cancelados. 2 omitidos (ya no aplicaban). Detenido: 1 sin procesar.',
    );
  });
});
