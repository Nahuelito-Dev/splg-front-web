import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import type { CompanyModule } from '../../../services/api/types';
import { failed, loading, mutation, ok } from '../../../test/pageTest';

const state = vi.hoisted(() => ({
  companies: undefined as unknown,
  modules: [] as unknown[],
}));
vi.mock('../../../services/queries/platformConsole', () => ({ usePlatformCompanies: () => state.companies }));
vi.mock('../../../services/queries/modules', () => ({
  usePlatformCompaniesModules: () => state.modules,
  usePlatformCompanyModules: () => ({ data: undefined, refetch: vi.fn(), isFetching: false }),
  useSetPlatformCompanyModule: () => mutation(),
}));

import { PlatformModules } from './PlatformModules';

const company = (id: string, name: string) => ({ id, name, slug: name.toLowerCase().replace(/ /g, '-') });

const module = (key: string, label: string, over: Partial<CompanyModule> = {}) =>
  ({
    key,
    label,
    inPlan: true,
    override: null,
    enabled: true,
    companySwitch: null,
    effective: true,
    impact: { pending: 0, description: '0 pendientes.' },
    ...over,
  }) as CompanyModule;

const draw = () =>
  render(
    <MemoryRouter>
      <PlatformModules />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  state.modules = [];
});

describe('PlatformModules (empresa × módulo)', () => {
  it('las columnas son los módulos que da la API, también uno que el panel no conoce', () => {
    state.companies = ok({ items: [company('c-1', 'Gas Norte')], total: 1 });
    state.modules = [
      ok([module('document_reading', 'Lector de documentos'), module('chat', 'Chat con la plataforma')]),
    ];
    draw();
    const table = screen.getByRole('table', { name: 'Módulos habilitados por empresa' });
    expect(within(table).getByRole('columnheader', { name: 'Lector de documentos' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Chat con la plataforma' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Chat con la plataforma habilitado para Gas Norte' })).toBeChecked();
  });

  it('marca la excepción y abre la confirmación al mover un interruptor', () => {
    state.companies = ok({ items: [company('c-1', 'Gas Norte')], total: 1 });
    state.modules = [
      ok([
        module('repurchase', 'Recompra anticipada', {
          enabled: false,
          effective: false,
          override: { enabled: false, reason: 'Pidió pausarla', expiresAt: null },
        }),
      ]),
    ];
    draw();
    expect(screen.getByText('Excepción')).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: 'Recompra anticipada habilitado para Gas Norte' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(screen.getByRole('heading', { name: '¿Habilitar «Recompra anticipada»?' })).toBeInTheDocument();
    expect(screen.getByText(/Para Gas Norte/)).toBeInTheDocument();
  });

  it('origen, uso y excepción (motivo y vencimiento) llegan al lector de pantalla; la celda vacía dice «No aplica»', () => {
    state.companies = ok({ items: [company('c-1', 'Gas Norte'), company('c-2', 'Gas Sur')], total: 2 });
    state.modules = [
      ok([
        module('repurchase', 'Recompra anticipada', {
          enabled: false,
          effective: false,
          override: { enabled: false, reason: 'Pidió pausarla', expiresAt: '2099-01-31T12:00:00.000Z' },
        }),
        module('chat', 'Chat con clientes'),
      ]),
      ok([module('repurchase', 'Recompra anticipada')]),
    ];
    draw();
    // No sólo `title` (que no llega con teclado en todos los lectores): un texto propio vinculado por aria-describedby.
    const describedText = (name: string) => {
      const id = screen.getByRole('switch', { name }).getAttribute('aria-describedby');
      return id ? document.getElementById(id)?.textContent : null;
    };
    expect(describedText('Recompra anticipada habilitado para Gas Norte')).toMatch(
      /Excepción: deshabilitado · Deshabilitado · Pidió pausarla · vence el/,
    );
    expect(describedText('Recompra anticipada habilitado para Gas Sur')).toBe('Incluido en el plan · En uso');
    expect(screen.getByText('No aplica')).toBeInTheDocument();
  });

  it('la empresa enlaza a su ficha en «Plan y módulos»', () => {
    state.companies = ok({ items: [company('c-1', 'Gas Norte')], total: 1 });
    state.modules = [ok([module('express', 'Compra express')])];
    draw();
    expect(screen.getByRole('link', { name: 'Gas Norte' })).toHaveAttribute('href', '/distributors/c-1?tab=modules');
  });

  it('si fallan los módulos de una empresa, esa fila lo dice y deja reintentar; las otras siguen', () => {
    const retry = vi.fn();
    state.companies = ok({ items: [company('c-1', 'Gas Norte'), company('c-2', 'Gas Sur')], total: 2 });
    state.modules = [
      { ...failed(retry), error: new ApiError(404, ['La empresa no existe o está dada de baja']) },
      ok([module('express', 'Compra express')]),
    ];
    draw();
    expect(screen.getByText('La empresa no existe o está dada de baja')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'Compra express habilitado para Gas Sur' })).toBeInTheDocument();
  });

  it('estados de la lista de empresas: cargando, vacía y error', () => {
    state.companies = loading();
    draw();
    expect(screen.getByRole('status', { name: 'Cargando las empresas' })).toBeInTheDocument();
    cleanup();
    state.companies = ok({ items: [], total: 0 });
    draw();
    expect(screen.getByText('No hay empresas')).toBeInTheDocument();
    cleanup();
    state.companies = failed();
    draw();
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
  });
});
