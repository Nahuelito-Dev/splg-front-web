import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  mode: 'company' as string,
  status: 'authenticated',
  context: 'company:u-a' as string | null,
}));
const api = vi.hoisted(() => ({
  getCompanyTheme: vi.fn(),
  putCompanyTheme: vi.fn(),
  previewCompanyTheme: vi.fn(),
  deleteCompanyTheme: vi.fn(),
}));
vi.mock('../../services/api/companyTheme', () => api);
vi.mock('../../services/queries/companyContext', () => ({
  useCompanyContext: () => state.context,
  currentCompanyContext: () => state.context,
}));
vi.mock('../../hooks', () => ({
  usePermissions: () => ({ mode: state.mode }),
  useAppSelector: (pick: (s: { auth: { status: string } }) => unknown) => pick({ auth: { status: state.status } }),
}));

import { companyThemeKey, useSaveCompanyTheme } from '../../services/queries/companyTheme';
import { CompanyThemeSync } from './CompanyThemeSync';

const modo = (primary: string) => ({
  primary,
  primaryHover: primary,
  primaryStrong: primary,
  primarySoft: primary,
  onPrimary: primary,
  accent: primary,
  accentSoft: primary,
  gradientFrom: primary,
  gradientTo: primary,
  gradientEdge: primary,
});
const tema = (primary: string, isDefault = false) => ({
  isDefault,
  tokens: { light: modo(primary), dark: modo(primary) },
});
const AZUL = '29 78 216';
const VERDE = '14 124 58';

const hoja = () => document.getElementById('splg-tema-empresa');

let client: QueryClient;
let save: ReturnType<typeof useSaveCompanyTheme> | null = null;
const SaveProbe = () => {
  save = useSaveCompanyTheme();
  return null;
};
const tree = () => (
  <QueryClientProvider client={client}>
    <CompanyThemeSync />
    <SaveProbe />
  </QueryClientProvider>
);
const draw = () => render(tree());

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  state.mode = 'company';
  state.status = 'authenticated';
  state.context = 'company:u-a';
  Object.values(api).forEach((fn) => fn.mockReset());
});
afterEach(cleanup);

describe('CompanyThemeSync', () => {
  it('en la empresa aplica el tema propio, guardado con la identidad del contexto en la clave', async () => {
    api.getCompanyTheme.mockResolvedValue(tema('#1D4ED8'));
    draw();
    await waitFor(() => expect(hoja()?.textContent).toContain(AZUL));
    expect(client.getQueryData(companyThemeKey('company:u-a'))).toBeDefined();
  });

  it('una empresa con el tema por omisión queda con Brasa (sin hoja)', async () => {
    api.getCompanyTheme.mockResolvedValue(tema('#CD4B00', true));
    draw();
    await waitFor(() => expect(api.getCompanyTheme).toHaveBeenCalled());
    expect(hoja()).toBeNull();
  });

  it('en la plataforma no pide el tema ni pinta nada', () => {
    state.mode = 'platform';
    state.context = null;
    draw();
    expect(api.getCompanyTheme).not.toHaveBeenCalled();
    expect(hoja()).toBeNull();
  });

  it('al cambiar de contexto (queryClient.clear) limpia en el mismo paso, sin esperar un render', async () => {
    api.getCompanyTheme.mockResolvedValue(tema('#1D4ED8'));
    draw();
    await waitFor(() => expect(hoja()).not.toBeNull());
    state.mode = 'platform';
    client.clear();
    expect(hoja()).toBeNull();
  });

  it('un guardado de A que responde después de pasar a B no escribe ni aplica el tema de A en B', async () => {
    state.mode = 'support';
    state.context = 'support:sesion-a';
    api.getCompanyTheme.mockResolvedValueOnce(tema('#1D4ED8'));
    let responder: (value: unknown) => void = () => undefined;
    api.putCompanyTheme.mockReturnValue(new Promise((resolve) => (responder = resolve)));
    const view = draw();
    await waitFor(() => expect(hoja()?.textContent).toContain(AZUL));

    const onError = vi.fn();
    act(() => save?.mutate({ primaryColor: '#7C3AED', accentColor: null, displayName: null }, { onError }));
    await waitFor(() => expect(api.putCompanyTheme).toHaveBeenCalled());

    // Pasa a B: la caché se vacía y llega el tema de B.
    api.getCompanyTheme.mockResolvedValueOnce(tema('#0E7C3A'));
    state.context = 'support:sesion-b';
    act(() => client.clear());
    view.rerender(tree());
    await waitFor(() => expect(hoja()?.textContent).toContain(VERDE));

    // Responde el PUT de A (violeta).
    await act(async () => {
      responder(tema('#7C3AED'));
      await Promise.resolve();
    });
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(hoja()?.textContent).toContain(VERDE);
    expect(hoja()?.textContent).not.toContain('124 58 237');
    expect(client.getQueryData(companyThemeKey('support:sesion-b'))).toEqual(tema('#0E7C3A'));
    expect(client.getQueryData(companyThemeKey('support:sesion-a'))).toBeUndefined();
  });

  it('al desmontar (cerrar sesión) limpia', async () => {
    api.getCompanyTheme.mockResolvedValue(tema('#1D4ED8'));
    const view = draw();
    await waitFor(() => expect(hoja()).not.toBeNull());
    view.unmount();
    expect(hoja()).toBeNull();
  });
});
