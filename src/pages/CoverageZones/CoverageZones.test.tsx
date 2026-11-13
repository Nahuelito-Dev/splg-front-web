import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CoverageZone } from '../../services/api/types';
import { loading, mutation, ok } from '../../test/pageTest';

const state = vi.hoisted(() => ({ zones: [] as unknown[], pending: false, narrow: true }));
vi.mock('@mui/material', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useMediaQuery: () => state.narrow,
}));
vi.mock('../../hooks', () => ({
  usePermissions: () => ({ canWrite: true, writeHint: undefined, needsDistributor: false }),
}));
vi.mock('../../services/queries/coverageZones', () => ({
  useCoverageZones: () => (state.pending ? loading() : ok({ rows: state.zones, total: state.zones.length })),
  useUpdateCoverageZone: () => mutation(),
  useDeleteCoverageZone: () => mutation(),
}));
vi.mock('./components/ZoneList', () => ({
  ZoneList: ({ rows, onEdit }: { rows: CoverageZone[]; onEdit?: (zone: CoverageZone) => void }) => (
    <button type="button" onClick={() => rows[0] && onEdit?.(rows[0])}>
      Editar zona
    </button>
  ),
}));
vi.mock('./components/ZoneMap', () => ({ ZoneMap: () => null }));
vi.mock('./components/CoverageCheckPanel', () => ({ CoverageCheckPanel: () => null }));
vi.mock('./components/ZoneDetailPanel', () => ({ ZoneDetailPanel: () => null }));
vi.mock('./components/ZoneFormPanel', () => ({ ZoneFormPanel: () => <p>Formulario de la zona</p> }));

import { CoverageZones } from './CoverageZones';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const zone = (over: Partial<CoverageZone>) =>
  ({
    coverage_zone_id: 'z',
    name: 'Centro',
    isActive: true,
    validUntil: null,
    area: { type: 'Polygon', coordinates: [[[-55.9, -27.36]]] },
    ...over,
  }) as CoverageZone;

const renderPage = (zones: CoverageZone[], { pending = false, narrow = true } = {}) => {
  state.zones = zones;
  state.pending = pending;
  state.narrow = narrow;
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

describe('CoverageZones: abrir el formulario', () => {
  const espiarScroll = (top: number) => {
    const scrolled: Element[] = [];
    const options: unknown[] = [];
    Element.prototype.scrollIntoView = vi.fn(function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
      scrolled.push(this);
      options.push(arg);
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect);
    return Object.assign(scrolled, { options });
  };

  // En una pantalla angosta el formulario queda debajo del mapa: sin traerlo a la vista, «Editar» parecía no hacer nada.
  it('«Editar zona» trae el formulario a la vista si quedó debajo de la pantalla', () => {
    const scrolled = espiarScroll(window.innerHeight + 800);
    renderPage([zone({})]);
    fireEvent.click(screen.getByRole('button', { name: 'Editar zona' }));
    expect(screen.getByText('Editar "Centro"')).toBeInTheDocument();
    expect(scrolled).toHaveLength(1);
    expect(scrolled[0]).toContainElement(screen.getByText('Formulario de la zona'));
    expect(scrolled.options[0]).toEqual(expect.objectContaining({ block: 'start' }));
  });

  it('«Nueva zona» también lo trae a la vista', () => {
    const scrolled = espiarScroll(window.innerHeight + 800);
    renderPage([zone({})]);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva zona' }));
    expect(scrolled).toHaveLength(1);
  });

  it('desde lg (formulario al costado del mapa) no mueve la página aunque el formulario quede abajo', () => {
    const scrolled = espiarScroll(window.innerHeight + 800);
    renderPage([zone({})], { narrow: false });
    fireEvent.click(screen.getByRole('button', { name: 'Editar zona' }));
    expect(screen.getByText('Editar "Centro"')).toBeInTheDocument();
    expect(scrolled).toHaveLength(0);
  });

  // Con el mapa todavía cargando, el formulario se abría arriba y el mapa de 560 px lo corría hacia abajo al llegar.
  it('«Nueva zona» no se puede abrir hasta que cargan las zonas', () => {
    const scrolled = espiarScroll(window.innerHeight + 800);
    renderPage([], { pending: true });
    const nueva = screen.getByRole('button', { name: 'Nueva zona' });
    expect(nueva).toBeDisabled();
    fireEvent.click(nueva);
    expect(screen.queryByText('Formulario de la zona')).not.toBeInTheDocument();
    expect(scrolled).toHaveLength(0);
  });

  it('si el formulario ya se ve no mueve la página', () => {
    const scrolled = espiarScroll(400);
    renderPage([zone({})]);
    fireEvent.click(screen.getByRole('button', { name: 'Editar zona' }));
    expect(scrolled).toHaveLength(0);
  });
});
