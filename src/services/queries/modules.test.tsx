import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';
import { getCompanyModules, setPlatformCompanyModule } from '../api/modules';
import type { CompanyModule, OwnModule } from '../api/types';
import { queryKeys } from './queryKeys';

vi.mock('../api/modules', () => ({
  getCompanyModules: vi.fn(),
  getPlatformCompanyModules: vi.fn(),
  setPlatformCompanyModule: vi.fn(),
}));
const ctx = vi.hoisted(() => ({ value: 'company:uid-a' as string | null }));
vi.mock('./companyContext', () => ({ useCompanyContext: () => ctx.value }));
// El queryClient de la app (con su `shouldRetry`) sin arrastrar el store ni Firebase.
vi.mock('../../store/store', () => ({ store: { dispatch: vi.fn(), getState: () => ({ auth: {} }) } }));

import { queryClient as appQueryClient } from './queryClient';
import {
  companyModulesKey,
  useCompanyModules,
  useModuleAvailability,
  useModuleGate,
  useSetPlatformCompanyModule,
} from './modules';

const own = (key: string, enabled: boolean): OwnModule =>
  ({ key, label: key, enabled, effective: enabled }) as OwnModule;
const platform = (key: string, enabled: boolean): CompanyModule =>
  ({
    key,
    label: key,
    inPlan: true,
    override: null,
    enabled,
    companySwitch: null,
    effective: enabled,
    impact: { pending: 0, description: '' },
  }) as CompanyModule;

const wrapperFor = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

afterEach(() => {
  vi.mocked(getCompanyModules).mockReset();
  vi.mocked(setPlatformCompanyModule).mockReset();
  ctx.value = 'company:uid-a';
  appQueryClient.clear();
});

describe('useCompanyModules', () => {
  it('la clave lleva la empresa que se mira: al cambiar de empresa no se leen los módulos de la otra', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(getCompanyModules).mockResolvedValueOnce([own('document_reading', false)]);
    const { result, rerender } = renderHook(() => useModuleAvailability(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.enabledByKey).toEqual({ document_reading: false }));
    expect(client.getQueryData(companyModulesKey('company:uid-a'))).toBeDefined();

    let resolveB: (value: OwnModule[]) => void = () => undefined;
    vi.mocked(getCompanyModules).mockReturnValueOnce(new Promise((resolve) => (resolveB = resolve)));
    ctx.value = 'support:ses-b';
    rerender();
    // Mientras B no respondió, no se usa lo de A.
    expect(result.current).toEqual({ enabledByKey: null, loading: true });
    act(() => resolveB([own('document_reading', true)]));
    await waitFor(() => expect(result.current.enabledByKey).toEqual({ document_reading: true }));
    expect(client.getQueryData(companyModulesKey('company:uid-a'))).toEqual([own('document_reading', false)]);
  });

  it('en la plataforma (sin empresa) no pide /company/modules y no esconde nada', async () => {
    ctx.value = null;
    const client = new QueryClient();
    const { result } = renderHook(
      () => ({ availability: useModuleAvailability(), gate: useModuleGate('repurchase') }),
      {
        wrapper: wrapperFor(client),
      },
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(getCompanyModules).not.toHaveBeenCalled();
    expect(result.current.availability).toEqual({ enabledByKey: null, loading: false });
    expect(result.current.gate).toEqual({ ready: true, off: false });
  });

  it('un 4xx no se reintenta (rige el shouldRetry del queryClient de la app)', async () => {
    vi.mocked(getCompanyModules).mockRejectedValue(new ApiError(403, ['Sin permiso'], 'PERMISSION_DENIED'));
    const { result } = renderHook(() => useCompanyModules(), { wrapper: wrapperFor(appQueryClient) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getCompanyModules).toHaveBeenCalledTimes(1);
  });

  it('useModuleGate: mientras carga no se pide; apagado, off; habilitado, ready', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let resolve: (value: OwnModule[]) => void = () => undefined;
    vi.mocked(getCompanyModules).mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => ({ off: useModuleGate('repurchase'), on: useModuleGate('express') }), {
      wrapper: wrapperFor(client),
    });
    expect(result.current.off).toEqual({ ready: false, off: false });
    act(() => resolve([own('repurchase', false), own('express', true)]));
    await waitFor(() => expect(result.current.off).toEqual({ ready: false, off: true }));
    expect(result.current.on).toEqual({ ready: true, off: false });
  });
});

describe('useSetPlatformCompanyModule', () => {
  it('reemplaza el módulo con lo que respondió el back e invalida esa empresa y los módulos de empresa', async () => {
    const client = new QueryClient();
    const key = queryKeys.platformModules.detail('c-1');
    client.setQueryData(key, [platform('document_reading', true), platform('express', true)]);
    const spy = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(setPlatformCompanyModule).mockResolvedValue(platform('document_reading', false));
    const { result } = renderHook(() => useSetPlatformCompanyModule(), { wrapper: wrapperFor(client) });
    result.current.mutate({
      companyId: 'c-1',
      key: 'document_reading',
      body: { enabled: false, reason: 'Motivo largo ok' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(setPlatformCompanyModule).toHaveBeenCalledWith('c-1', 'document_reading', {
      enabled: false,
      reason: 'Motivo largo ok',
    });
    expect(client.getQueryData<CompanyModule[]>(key)?.map((m) => [m.key, m.enabled])).toEqual([
      ['document_reading', false],
      ['express', true],
    ]);
    expect(spy).toHaveBeenCalledWith({ queryKey: key });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.companyModules.all });
  });
});
