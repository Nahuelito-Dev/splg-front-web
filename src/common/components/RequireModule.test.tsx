import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorState } from './ui';

const state = vi.hoisted(() => ({
  context: 'company:uid-1' as string | null,
  mode: 'company' as string,
  query: { data: undefined as unknown, isPending: false },
}));
vi.mock('../../services/queries/companyContext', () => ({ useCompanyContext: () => state.context }));
const gate = vi.hoisted(() => ({ ready: true, off: false }));
vi.mock('../../services/queries/modules', () => ({
  useCompanyModules: () => state.query,
  useModuleGate: () => gate,
}));
vi.mock('../../hooks', () => ({ usePermissions: () => ({ mode: state.mode }) }));

import { IfModule, RequireModule } from './RequireModule';

const MODULES = [
  { key: 'document_reading', label: 'Lector de documentos', enabled: false, effective: false },
  { key: 'repurchase', label: 'Recompra anticipada', enabled: true, effective: true },
];

const renderRoute = (url = '/document-readings') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/home" element={<p>Tablero</p>} />
        <Route path="/support" element={<p>Ayuda</p>} />
        <Route element={<RequireModule module="document_reading" />}>
          <Route path="/document-readings" element={<p>Pantalla del lector</p>} />
        </Route>
        <Route element={<RequireModule module="repurchase" />}>
          <Route path="/customers/repurchase" element={<p>Pantalla de recompra</p>} />
        </Route>
        <Route element={<RequireModule module="whatsapp" />}>
          <Route path="/whatsapp" element={<p>Pantalla de WhatsApp</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  state.context = 'company:uid-1';
  state.mode = 'company';
  state.query = { data: undefined, isPending: false };
});

describe('RequireModule', () => {
  it('por URL a un módulo que la plataforma no le habilitó: «No incluido en tu plan» con su nombre, sin montar la pantalla', () => {
    state.query = { data: MODULES, isPending: false };
    renderRoute();
    expect(screen.getByText('No incluido en tu plan')).toBeInTheDocument();
    expect(screen.getByText(/«Lector de documentos» no está habilitado/)).toBeInTheDocument();
    expect(screen.queryByText('Pantalla del lector')).not.toBeInTheDocument();
  });

  it('ofrece volver al tablero y consultar a la plataforma por Ayuda', () => {
    state.query = { data: MODULES, isPending: false };
    renderRoute();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar a la plataforma' }));
    expect(screen.getByText('Ayuda')).toBeInTheDocument();
  });

  it('en modo soporte no ofrece el chat (es de la empresa), sólo volver', () => {
    state.mode = 'support';
    state.query = { data: MODULES, isPending: false };
    renderRoute();
    expect(screen.queryByRole('button', { name: 'Consultar a la plataforma' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ir al tablero' }));
    expect(screen.getByText('Tablero')).toBeInTheDocument();
  });

  it('con el módulo habilitado se ve la pantalla', () => {
    state.query = { data: MODULES, isPending: false };
    renderRoute('/customers/repurchase');
    expect(screen.getByText('Pantalla de recompra')).toBeInTheDocument();
  });

  it('un módulo que el catálogo de la API no trae es núcleo: no se bloquea', () => {
    state.query = { data: MODULES, isPending: false };
    renderRoute('/whatsapp');
    expect(screen.getByText('Pantalla de WhatsApp')).toBeInTheDocument();
  });

  it('mientras no se sabe, espera sin montar la pantalla (que pediría y recibiría 403)', () => {
    state.query = { data: undefined, isPending: true };
    renderRoute();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla del lector')).not.toBeInTheDocument();
  });

  it('si no se pudieron leer los módulos deja pasar: el back decide', () => {
    state.query = { data: undefined, isPending: false };
    renderRoute();
    expect(screen.getByText('Pantalla del lector')).toBeInTheDocument();
  });

  it('en la plataforma (sin empresa) no decide: lo hace RequireCompanyScope', () => {
    state.context = null;
    renderRoute();
    expect(screen.getByText('Pantalla del lector')).toBeInTheDocument();
  });

  it('al habilitarse de nuevo, la pantalla vuelve sin recargar', () => {
    state.query = { data: MODULES, isPending: false };
    const { rerender } = renderRoute();
    expect(screen.getByText('No incluido en tu plan')).toBeInTheDocument();
    state.query = { data: MODULES.map((m) => ({ ...m, enabled: true })), isPending: false };
    rerender(
      <MemoryRouter initialEntries={['/document-readings']}>
        <Routes>
          <Route element={<RequireModule module="document_reading" />}>
            <Route path="/document-readings" element={<p>Pantalla del lector</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Pantalla del lector')).toBeInTheDocument();
  });
});

describe('ErrorState con 403 MODULE_DISABLED', () => {
  it('una pantalla abierta cuando la plataforma apaga el módulo muestra «No incluido en tu plan», sin «Reintentar»', () => {
    const error = new AxiosError('fallo');
    error.response = {
      status: 403,
      data: { message: 'La función no está habilitada', code: 'MODULE_DISABLED' },
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    render(<ErrorState error={error} onRetry={vi.fn()} />);
    expect(screen.getByText('No incluido en tu plan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });
});

describe('IfModule (lo de un módulo dentro de una pantalla del núcleo)', () => {
  const Card = vi.fn(() => <p>Tarjeta del planificador</p>);
  const draw = () =>
    render(
      <IfModule module="fleet_planner">
        <Card />
      </IfModule>,
    );

  afterEach(() => {
    gate.ready = true;
    gate.off = false;
    Card.mockClear();
  });

  it('apagado: la tarjeta no se monta, así que ni pide sus datos ni muestra un error', () => {
    gate.ready = false;
    gate.off = true;
    draw();
    expect(screen.queryByText('Tarjeta del planificador')).not.toBeInTheDocument();
    expect(Card).not.toHaveBeenCalled();
  });

  it('mientras no se sabe tampoco se monta (no aparece un 403 que enseguida se va)', () => {
    gate.ready = false;
    draw();
    expect(Card).not.toHaveBeenCalled();
  });

  it('habilitado: se ve', () => {
    draw();
    expect(screen.getByText('Tarjeta del planificador')).toBeInTheDocument();
  });
});
