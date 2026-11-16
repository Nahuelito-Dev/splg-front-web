import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Delivery } from '../../../services/api/types';

const api = vi.hoisted(() => ({ getPhotoLink: vi.fn(), uploadPhoto: vi.fn(), removePhoto: vi.fn() }));
const perms = vi.hoisted(() => ({ canWrite: true, writeHint: undefined as string | undefined }));
vi.mock('../../../services/api/photos', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../../hooks', () => ({
  usePermissions: () => ({ ...perms, needsDistributor: false }),
  usePermiso: () => ({ allowed: true, known: true }),
  useDebounce: <T,>(value: T) => value,
}));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('./DeliveryLocationCard', () => ({ DeliveryLocationCard: () => null }));
vi.mock('../../../services/queries/distributors', () => ({
  useCurrentDistributor: () => ({ data: { distributor_id: 'd-1', name: 'Gas Norte', logo_url: null } }),
}));
const tokens = {
  primary: '',
  primaryHover: '',
  primaryStrong: '',
  primarySoft: '',
  onPrimary: '',
  accent: '',
  accentSoft: '',
  gradientFrom: '',
  gradientTo: '',
  gradientEdge: '',
};
const theme = {
  primaryColor: '#1D4ED8',
  accentColor: null,
  displayName: null,
  companyName: 'Gas Norte',
  logoUrl: null,
  tokens: { light: tokens, dark: tokens },
  contrast: [],
  version: 0,
  isDefault: true,
  updatedAt: null,
};
const idle = { mutate: vi.fn(), isPending: false };
vi.mock('../../../services/queries/companyTheme', () => ({
  useCompanyTheme: () => ({ data: theme, isPending: false, error: null, refetch: vi.fn() }),
  useSaveCompanyTheme: () => idle,
  useResetCompanyTheme: () => idle,
  usePreviewCompanyTheme: () => idle,
  isStaleCompanyContext: () => false,
}));

const { DeliveryOverview } = await import('./DeliveryOverview');
const { Appearance } = await import('../../Configuration/Appearance');

const draw = (ui: ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const pick = (label: string) =>
  fireEvent.change(screen.getByLabelText(label), {
    target: { files: [new File([new Uint8Array(10)], 'f.png', { type: 'image/png' })] },
  });
const delivery = { user_id: 'u-1', user: { email: 'c@x.com', photoUrl: null } } as unknown as Delivery;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  perms.canWrite = true;
  perms.writeHint = undefined;
});

describe('fotos en modo soporte (sólo lectura)', () => {
  it.each([
    ['la foto del chofer', () => draw(<DeliveryOverview delivery={delivery} />), 'Elegir la foto de perfil'],
    ['el logo de la empresa (Apariencia)', () => draw(<Appearance />), 'Elegir la foto de la empresa'],
  ])('%s no se sube en sólo lectura', async (_name, render, label) => {
    perms.canWrite = false;
    perms.writeHint = 'Modo soporte: sólo lectura';
    render();
    pick(label);
    await new Promise((r) => setTimeout(r, 20));
    expect(api.uploadPhoto).not.toHaveBeenCalled();
  });

  it.each([
    ['la foto del chofer', () => draw(<DeliveryOverview delivery={delivery} />), 'Elegir la foto de perfil', 'user'],
    ['el logo de la empresa (Apariencia)', () => draw(<Appearance />), 'Elegir la foto de la empresa', 'distributor'],
  ])('%s se sube con permiso de escritura', async (_name, render, label, kind) => {
    api.uploadPhoto.mockResolvedValue(undefined);
    render();
    pick(label);
    await vi.waitFor(() => expect(api.uploadPhoto).toHaveBeenCalledWith(kind, expect.any(String), expect.any(File)));
  });
});
