import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSummary } from '../../test/fixtures';
import { ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
}));
vi.mock('../../services/queries/truckLoads', () => ({
  useTruckLoads: (...args: unknown[]) => state.list(...args) as unknown,
}));
vi.mock('../Stock/components/useStockOptions', () => ({
  useCarOptions: () => ({ options: [], failed: false }),
  useDriverOptions: () => ({ options: [], failed: false }),
}));
vi.mock('./components/OpenTruckLoadModal', () => ({ OpenTruckLoadModal: () => null }));
vi.mock('./components/TruckStockCard', () => ({ TruckStockCard: () => null }));

import { TruckLoads } from './TruckLoads';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TruckLoads: foto de la carga', () => {
  const PHOTO = 'https://fotos.test/carga.jpg';
  const draw = (photoUrl: string | null) => {
    state.list.mockReturnValue(ok(pageOf([loadSummary({ photoUrl })])));
    return renderPage(<TruckLoads />, { url: '/truck-loads' });
  };

  it('muestra la foto de la carga si viene', () => {
    const { container } = draw(PHOTO);
    expect(container.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
  });

  it('sin foto queda el ícono de siempre', () => {
    const { container } = draw(null);
    expect(container.querySelector('img')).toBeNull();
  });
});
