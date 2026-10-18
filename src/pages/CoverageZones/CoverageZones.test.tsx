import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CoverageZone } from '../../services/api/types';
import { mutation, ok } from '../../test/pageTest';

const state = vi.hoisted(() => ({ zones: [] as unknown[] }));
vi.mock('../../hooks', () => ({
  usePermissions: () => ({ canWrite: true, writeHint: undefined, needsDistributor: false }),
}));
vi.mock('../../services/queries/coverageZones', () => ({
  useCoverageZones: () => ok({ rows: state.zones, total: state.zones.length }),
  useUpdateCoverageZone: () => mutation(),
  useDeleteCoverageZone: () => mutation(),
}));
vi.mock('./components/ZoneList', () => ({ ZoneList: () => null }));
vi.mock('./components/ZoneMap', () => ({ ZoneMap: () => null }));
vi.mock('./components/CoverageCheckPanel', () => ({ CoverageCheckPanel: () => null }));
vi.mock('./components/ZoneDetailPanel', () => ({ ZoneDetailPanel: () => null }));
vi.mock('./components/ZoneFormPanel', () => ({ ZoneFormPanel: () => null }));

import { CoverageZones } from './CoverageZones';

afterEach(cleanup);

const zone = (over: Partial<CoverageZone>) =>
  ({ coverage_zone_id: 'z', name: 'Centro', isActive: true, validUntil: null, ...over }) as CoverageZone;

const renderPage = (zones: CoverageZone[]) => {
  state.zones = zones;
  render(
    <MemoryRouter>
      <CoverageZones />
    </MemoryRouter>,
  );
};

const AVISO = 'La distribuidora no tiene zonas de cobertura activas ni vigentes';

describe('CoverageZones: aviso sin cobertura', () => {
  it('con una zona activa y vigente no avisa', () => {
    renderPage([zone({}), zone({ coverage_zone_id: 'z2', isActive: false })]);
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('con zonas pero todas apagadas avisa', () => {
    renderPage([zone({ isActive: false })]);
    expect(screen.getByRole('alert')).toHaveTextContent(AVISO);
  });

  it('con la única zona activa ya vencida (el barrido todavía no pasó) avisa', () => {
    renderPage([zone({ validUntil: '2020-01-01T00:00:00Z' })]);
    expect(screen.getByRole('alert')).toHaveTextContent(AVISO);
  });

  it('si nunca cargó zonas no avisa (cubre todo)', () => {
    renderPage([]);
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });
});
