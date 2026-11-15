import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompanyModule } from '../../../services/api/types';
import { failed, loading, mutation, ok } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ list: undefined as unknown }));
vi.mock('../../../services/queries/modules', () => ({
  usePlatformCompanyModules: () => ({ ...(state.list as object), isFetching: false }),
  useSetPlatformCompanyModule: () => mutation(),
}));

import { CompanyModulesList } from './CompanyModulesList';

const module = (over: Partial<CompanyModule> = {}) =>
  ({
    key: 'repurchase',
    label: 'Recompra anticipada',
    inPlan: true,
    override: null,
    enabled: true,
    companySwitch: false,
    effective: false,
    impact: { pending: 2, description: '2 invitación(es) de recompra vigente(s).' },
    ...over,
  }) as CompanyModule;

const draw = () => render(<CompanyModulesList companyId="c-1" companyName="Gas Norte" />);

afterEach(cleanup);

describe('CompanyModulesList («Plan y módulos»)', () => {
  it('cada módulo con lo del plan, cómo lo usa la empresa y la excepción con su motivo y vencimiento', () => {
    state.list = ok([
      module(),
      module({
        key: 'document_reading',
        label: 'Lector de documentos',
        inPlan: false,
        enabled: true,
        effective: true,
        companySwitch: true,
        override: { enabled: true, reason: 'Prueba pedida por la empresa', expiresAt: '2099-01-31T12:00:00.000Z' },
      }),
    ]);
    draw();
    expect(screen.getByText('Incluido en el plan')).toBeInTheDocument();
    expect(screen.getByText('Apagado por la empresa')).toBeInTheDocument();
    expect(screen.getByText('Excepción: habilitado')).toBeInTheDocument();
    expect(screen.getByText(/Prueba pedida por la empresa · vence el/)).toBeInTheDocument();
  });

  it('mover el interruptor abre la confirmación con lo que queda en curso', () => {
    state.list = ok([module()]);
    draw();
    fireEvent.click(screen.getByRole('switch', { name: 'Recompra anticipada habilitado para Gas Norte' }));
    expect(screen.getByRole('heading', { name: '¿Deshabilitar «Recompra anticipada»?' })).toBeInTheDocument();
    expect(screen.getByText('Quedan 2 en curso')).toBeInTheDocument();
  });

  it('cargando, vacío y error', () => {
    state.list = loading();
    draw();
    expect(screen.getByRole('status', { name: 'Cargando los módulos' })).toBeInTheDocument();
    cleanup();
    state.list = ok([]);
    draw();
    expect(screen.getByText('Sin módulos')).toBeInTheDocument();
    cleanup();
    const retry = vi.fn();
    state.list = failed(retry);
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalled();
  });
});
