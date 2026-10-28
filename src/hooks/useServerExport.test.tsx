import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('./useServerExport');

const mutate = vi.hoisted(() => vi.fn<[unknown, unknown], void>());
const state = vi.hoisted(() => ({ pending: false, operateHint: undefined as string | undefined }));
const notify = vi.hoisted(() => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }));
const save = vi.hoisted(() => vi.fn());
vi.mock('../services/queries/exports', () => ({ useDownloadExport: () => ({ mutate, isPending: state.pending }) }));
vi.mock('./usePermissions', () => ({ usePermissions: () => ({ operateHint: state.operateHint }) }));
vi.mock('../utils/notifications', () => ({ notify }));
vi.mock('../utils/fileSource', () => ({ saveFileSource: save }));

import { useServerExport } from './useServerExport';

beforeEach(() => {
  vi.clearAllMocks();
  state.pending = false;
  state.operateHint = undefined;
});

const items = (config?: Parameters<typeof useServerExport>[0]) =>
  renderHook(() => useServerExport(config)).result.current;

describe('useServerExport', () => {
  it('sin configuración no agrega acciones', () => {
    expect(items(undefined)).toEqual([]);
  });

  it('CSV y Excel piden al back el recurso con sus filtros', () => {
    const [csv, xlsx] = items({ resource: 'clientes', params: { term: 'ana' } });
    expect([csv.label, xlsx.label]).toEqual(['Exportar CSV', 'Exportar Excel']);
    csv.onClick?.();
    xlsx.onClick?.();
    expect(mutate).toHaveBeenNthCalledWith(
      1,
      { resource: 'clientes', format: 'csv', params: { term: 'ana' } },
      expect.any(Object),
    );
    expect(mutate).toHaveBeenNthCalledWith(
      2,
      { resource: 'clientes', format: 'xlsx', params: { term: 'ana' } },
      expect.any(Object),
    );
  });

  it('al terminar guarda el archivo y cuenta las filas; si falla, avisa el error', () => {
    const [csv] = items({ resource: 'pedidos' });
    csv.onClick?.();
    const handlers = mutate.mock.calls[0][1] as {
      onSuccess: (r: { blob: Blob; filename: string; total: number }) => void;
      onError: (e: unknown) => void;
    };
    const blob = new Blob(['x']);
    handlers.onSuccess({ blob, filename: 'pedidos-2026-10-28.csv', total: 12 });
    expect(save).toHaveBeenCalledWith({ kind: 'blob', blob }, 'pedidos-2026-10-28.csv');
    expect(notify.success).toHaveBeenCalledWith('Se exportaron 12 filas');
    const failure = new Error('tope');
    handlers.onError(failure);
    expect(notify.error).toHaveBeenCalledWith(failure);
  });

  it('bloqueado: usa el motivo de la pantalla, o pide elegir distribuidora, o avisa que ya hay un exporte', () => {
    expect(items({ resource: 'pedidos', blockedReason: 'Quitá la búsqueda' })[0].blockedReason).toBe(
      'Quitá la búsqueda',
    );
    state.operateHint = 'Elegí una distribuidora';
    expect(items({ resource: 'pedidos' })[1].blockedReason).toBe('Elegí una distribuidora');
    state.operateHint = undefined;
    state.pending = true;
    expect(items({ resource: 'pedidos' })[0].blockedReason).toBe('Ya se está preparando un exporte');
  });
});
