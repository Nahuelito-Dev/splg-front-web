import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok } from '../../test/pageTest';
import { Appearance } from './Appearance';
import { BRASA_TOKENS } from '../../theme/themeTokens';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  manage: { allowed: true, known: true },
  query: undefined as unknown,
  save: undefined as unknown,
  reset: undefined as unknown,
  preview: undefined as unknown,
}));
vi.mock('../../hooks', () => ({
  usePermissions: () => state.perms,
  usePermiso: () => state.manage,
  useDebounce: <T,>(value: T) => value,
}));
vi.mock('../../services/queries/companyTheme', () => ({
  useCompanyTheme: () => state.query,
  useSaveCompanyTheme: () => state.save,
  useResetCompanyTheme: () => state.reset,
  usePreviewCompanyTheme: () => state.preview,
  isStaleCompanyContext: () => false,
}));
vi.mock('../../services/queries/distributors', () => ({
  useCurrentDistributor: () => ({ data: { distributor_id: 'd1', photoUrl: null, logo_url: null } }),
}));
vi.mock('../../common/components/ui/EntityPhoto', () => ({ EntityPhoto: () => <p>logo</p> }));
vi.mock('../../utils/notifications', () => ({
  confirm: () => Promise.resolve(true),
  notify: { success: vi.fn(), error: vi.fn() },
}));

const modo = (primary: string) => ({
  ...BRASA_TOKENS.dark,
  side: '#100A20',
  sideText: '#A19FB0',
  primary,
  primaryHover: primary,
  primaryStrong: primary,
  primarySoft: primary,
  onPrimary: '#FFFFFF',
  accent: '#956CD7',
  accentSoft: primary,
  gradientFrom: primary,
  gradientTo: primary,
  gradientEdge: primary,
});
const theme = (over: Record<string, unknown> = {}) => ({
  primaryColor: '#1D4ED8',
  accentColor: null,
  displayName: 'Nahuel Gas',
  companyName: 'Distribuidora Demo',
  logoUrl: null,
  tokens: { light: modo('#1D4ED8'), dark: modo('#265AE4') },
  contrast: [
    { pair: 'onPrimary/primary', mode: 'light', ratio: 6.7, required: 4.5, ok: true },
    { pair: 'primary/surface', mode: 'dark', ratio: 3.2, required: 3, ok: true },
  ],
  version: 2,
  isDefault: false,
  updatedAt: '2026-11-14T12:00:00.000Z',
  ...over,
});

const contrastError = () =>
  new AxiosError('400', '400', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {
      statusCode: 400,
      code: 'THEME_CONTRAST_INSUFFICIENT',
      message:
        'El color principal no contrasta lo suficiente con el blanco (1,54:1; hace falta 3:1). Probá con #B48700',
      field: 'primaryColor',
      pair: 'primary/surface',
      ratio: 1.54,
      required: 3,
      suggestion: '#B48700',
    },
  });

const setup = (data = theme()) => {
  state.query = ok(data);
  state.save = mutation();
  state.reset = mutation();
  state.preview = mutation();
  render(
    <MemoryRouter>
      <Appearance />
    </MemoryRouter>,
  );
  return {
    save: state.save as ReturnType<typeof mutation>,
    reset: state.reset as ReturnType<typeof mutation>,
    preview: state.preview as ReturnType<typeof mutation>,
  };
};

afterEach(() => {
  cleanup();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
  state.manage = { allowed: true, known: true };
});

describe('Apariencia', () => {
  it('muestra el tema vigente, la vista previa en claro y oscuro y el contraste', () => {
    setup();
    expect(screen.getByLabelText('Nombre para mostrar')).toHaveValue('Nahuel Gas');
    expect(screen.getByLabelText('Color principal')).toHaveValue('#1D4ED8');
    expect(screen.getByLabelText('Vista previa en modo claro')).toBeInTheDocument();
    expect(screen.getByLabelText('Vista previa en modo oscuro')).toBeInTheDocument();
    expect(screen.getByText('Texto de los botones sobre el color principal')).toBeInTheDocument();
    expect(screen.getByText('6,7:1 / 4,5:1')).toBeInTheDocument();
  });

  it('sin tema propio (isDefault) la vista previa muestra Brasa, que es lo que pinta el panel', () => {
    setup(theme({ isDefault: true }));
    const menus = screen.getAllByLabelText('Menú lateral');
    expect(menus).toHaveLength(2);
    for (const menu of menus) {
      // brand.sidebar.bg (#0B0F16) y brand.sidebar.text (#98A2B3), no los tokens teñidos de la API.
      expect(menu).toHaveStyle({ background: 'rgb(11, 15, 22)' });
      expect(within(menu).getByText('Clientes')).toHaveStyle({ color: 'rgb(152, 162, 179)' });
    }
  });

  it('la vista previa muestra el menú lateral con los tokens del tema, en claro y en oscuro', () => {
    setup();
    const menus = screen.getAllByLabelText('Menú lateral');
    expect(menus).toHaveLength(2);
    for (const menu of menus) {
      expect(menu).toHaveStyle({ background: 'rgb(16, 10, 32)' });
      expect(within(menu).getByText('Clientes')).toHaveStyle({ color: 'rgb(161, 159, 176)' });
    }
  });

  it('pide la vista previa al back con lo que se escribe y guarda el cuerpo normalizado', async () => {
    const { preview, save } = setup();
    fireEvent.change(screen.getByLabelText('Color principal'), { target: { value: '#0e7c3a' } });
    await waitFor(() =>
      expect(preview.mutate).toHaveBeenLastCalledWith(
        { primaryColor: '#0E7C3A', accentColor: null, displayName: 'Nahuel Gas' },
        expect.anything(),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(save.mutate).toHaveBeenCalledWith(
        { primaryColor: '#0E7C3A', accentColor: null, displayName: 'Nahuel Gas' },
        expect.anything(),
      ),
    );
  });

  it('aplica una paleta preestablecida a la vista previa y al guardado', async () => {
    const { preview, save } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Violeta' }));
    await waitFor(() =>
      expect(preview.mutate).toHaveBeenLastCalledWith(
        { primaryColor: '#6D28D9', accentColor: '#7B43C5', displayName: 'Nahuel Gas' },
        expect.anything(),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(save.mutate).toHaveBeenCalledWith(
        { primaryColor: '#6D28D9', accentColor: '#7B43C5', displayName: 'Nahuel Gas' },
        expect.anything(),
      ),
    );
  });

  it('el 400 de contraste se muestra con «Usar el sugerido», que cambia el color', async () => {
    const { preview } = setup();
    preview.mutate.mockImplementation((_body: unknown, opts?: unknown) =>
      (opts as { onError: (e: unknown) => void }).onError(contrastError()),
    );
    fireEvent.change(screen.getByLabelText('Color principal'), { target: { value: '#FEC84B' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Probá con #B48700');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    preview.mutate.mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: /Usar el sugerido/ }));
    await waitFor(() => expect(screen.getByLabelText('Color principal')).toHaveValue('#B48700'));
  });

  it('restablecer pide confirmación y borra el tema propio', async () => {
    const { reset } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
    await waitFor(() => expect(reset.mutate).toHaveBeenCalled());
  });

  it('con el tema por omisión no hay nada que restablecer', () => {
    setup(theme({ isDefault: true, displayName: null }));
    expect(screen.getByRole('button', { name: 'Restablecer' })).toBeDisabled();
    expect(screen.getByLabelText('Nombre para mostrar')).toHaveAttribute('placeholder', 'Distribuidora Demo');
  });

  it('en modo soporte es sólo lectura', () => {
    state.perms = { needsDistributor: false, canWrite: false, writeHint: 'Modo soporte: sólo lectura' };
    setup();
    expect(screen.getByLabelText('Color principal')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Restablecer' })).toBeDisabled();
  });

  it('sin el permiso de gestionar la configuración también es sólo lectura', () => {
    state.manage = { allowed: false, known: true };
    setup();
    expect(screen.getByLabelText('Nombre para mostrar')).toBeDisabled();
  });

  it('el administrador general en la plataforma no tiene empresa', () => {
    state.perms = { needsDistributor: true, canWrite: false, writeHint: undefined };
    setup();
    expect(screen.getByText(/Elegí una distribuidora/)).toBeInTheDocument();
  });
});
