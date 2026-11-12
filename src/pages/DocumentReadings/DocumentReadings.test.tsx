import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeListStates, mutation, ok, pageOf, renderPage } from '../../test/pageTest';
import { readingOf } from './documentReadingFixtures';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  list: undefined as unknown,
  spend: undefined as unknown,
  simulate: undefined as unknown,
  run: undefined as unknown,
  confirmed: true,
  enabled: 1,
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => state.perms,
}));
vi.mock('../../services/queries/documentReadings', () => ({
  useDocumentReadings: () => state.list,
  useDocumentReadingStatusCounts: () => ({ all: 1, proposed: 1 }),
  useDocumentReadingSpend: () => state.spend,
  useSimulateDocumentReadings: () => state.simulate,
  useRunDocumentReadings: () => state.run,
}));
vi.mock('../../services/queries/moduleConfig', () => ({
  useProcessConfigs: () =>
    ok([
      {
        process: 'document_reading',
        params: { enabled: state.enabled, monthlyBudgetUsd: 20 },
        fields: [],
        isDefault: false,
      },
    ]),
}));
const notifications = vi.hoisted(() => ({ success: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../utils/notifications', () => ({
  confirm: () => Promise.resolve(state.confirmed),
  notify: notifications,
}));

import { DocumentReadings } from './DocumentReadings';

type Mut = ReturnType<typeof mutation>;
type Callbacks = { onSuccess?: (data: unknown) => void; onError?: (error: unknown) => void };

const setup = () => {
  state.simulate = mutation();
  state.run = mutation();
  renderPage(<DocumentReadings />, { url: '/document-readings' });
  return { simulate: state.simulate as Mut, run: state.run as Mut };
};

/** La mutación responde (bien o mal) en el momento en que se llama. */
const answer = (m: Mut, outcome: { data?: unknown; error?: unknown }) =>
  m.mutate.mockImplementation((_vars: unknown, callbacks?: unknown) => {
    const cb = callbacks as Callbacks;
    if (outcome.error) cb.onError?.(outcome.error);
    else cb.onSuccess?.(outcome.data);
  });

afterEach(() => {
  cleanup();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
  state.spend = ok({ readings: 3, costUsd: 5, available: true });
  state.confirmed = true;
  state.enabled = 1;
  vi.clearAllMocks();
});
state.spend = ok({ readings: 3, costUsd: 5, available: true });
state.simulate = mutation();
state.run = mutation();

describeListStates({
  name: 'Lectura de documentos',
  url: '/document-readings',
  page: <DocumentReadings />,
  setResult: (r) => {
    state.list = r;
  },
  withRow: () => ok(pageOf([readingOf()])),
  withoutRows: () => ok(pageOf([])),
  rowText: 'recibo-noviembre.pdf',
  emptyText: 'Todavía no se leyó ningún documento',
  loadingLabel: 'Cargando lecturas',
});

describe('DocumentReadings', () => {
  it('cada fila dice documento, dueño, tipo y estado, y lleva a la ficha', () => {
    state.list = ok(pageOf([readingOf()]));
    setup();

    expect(screen.getByText('Cuota de seguro')).toBeInTheDocument();
    expect(screen.getAllByText('Por revisar').length).toBeGreaterThan(1);
    expect(screen.getByText(/Comprobante de pago ·/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver lectura' }));
    expect(screen.getByText('otra ruta')).toBeInTheDocument();
  });

  it('con un filtro y sin filas, el vacío es «Sin resultados»', () => {
    state.list = ok(pageOf([]));
    state.simulate = mutation();
    state.run = mutation();
    renderPage(<DocumentReadings />, { url: '/document-readings?type=poliza' });

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('la tarjeta del gasto muestra lo gastado contra el tope y que la lectura automática está apagada', () => {
    state.list = ok(pageOf([]));
    state.enabled = 0;
    setup();

    expect(screen.getByText('USD 5,00')).toBeInTheDocument();
    expect(screen.getByText(/de USD 20,00 de tope/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tope de gasto usado' })).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText(/La lectura automática está apagada/)).toBeInTheDocument();
  });

  it('«Leer ahora» primero simula, pide confirmación con la cantidad y recién después lee', async () => {
    state.list = ok(pageOf([]));
    const { simulate, run } = setup();
    answer(simulate, { data: { read: 3, budgetReached: 0, distributors: 1, duplicates: 0, failed: 0, skipped: 0 } });
    answer(run, { data: { read: 3, budgetReached: 0, distributors: 1, duplicates: 0, failed: 0, skipped: 0 } });

    fireEvent.click(screen.getByRole('button', { name: 'Leer ahora' }));

    await waitFor(() => expect(run.mutate).toHaveBeenCalledTimes(1));
    expect(notifications.success).toHaveBeenCalledWith('Lectura terminada: 3 leídos.');
  });

  it('si no confirma, no lee', async () => {
    state.list = ok(pageOf([]));
    state.confirmed = false;
    const { simulate, run } = setup();
    answer(simulate, { data: { read: 2, budgetReached: 0 } });

    fireEvent.click(screen.getByRole('button', { name: 'Leer ahora' }));

    await waitFor(() => expect(simulate.mutate).toHaveBeenCalled());
    expect(run.mutate).not.toHaveBeenCalled();
  });

  it('sin pendientes avisa y no lee', async () => {
    state.list = ok(pageOf([]));
    const { simulate, run } = setup();
    answer(simulate, { data: { read: 0, budgetReached: 0 } });

    fireEvent.click(screen.getByRole('button', { name: 'Leer ahora' }));

    await waitFor(() => expect(notifications.info).toHaveBeenCalledWith('No hay documentos pendientes de leer.'));
    expect(run.mutate).not.toHaveBeenCalled();
  });

  it('con la lectura apagada cuenta los pendientes pero no ofrece leer (el back respondería 409)', async () => {
    state.list = ok(pageOf([]));
    state.enabled = 0;
    const { simulate, run } = setup();
    answer(simulate, { data: { read: 2, budgetReached: 0 } });

    fireEvent.click(screen.getByRole('button', { name: 'Leer ahora' }));

    await waitFor(() =>
      expect(notifications.info).toHaveBeenCalledWith(
        'Se leerían 2 documentos. La lectura de documentos está apagada: encendela en Procesos automáticos para leerlos.',
      ),
    );
    expect(run.mutate).not.toHaveBeenCalled();
  });

  it('un error de la corrida (409 apagada, 503 sin lector) se muestra con su texto', async () => {
    state.list = ok(pageOf([]));
    const { simulate, run } = setup();
    const error = new Error('La lectura de documentos está apagada');
    answer(simulate, { data: { read: 1, budgetReached: 0 } });
    answer(run, { error });

    fireEvent.click(screen.getByRole('button', { name: 'Leer ahora' }));

    await waitFor(() => expect(notifications.error).toHaveBeenCalledWith(error));
  });

  it('un error de la simulación también se muestra', () => {
    state.list = ok(pageOf([]));
    const { simulate } = setup();
    const error = new Error('boom');
    answer(simulate, { error });

    fireEvent.click(screen.getByRole('button', { name: 'Leer ahora' }));

    expect(notifications.error).toHaveBeenCalledWith(error);
  });

  it('sin lector configurado o sin poder escribir, «Leer ahora» no se puede y dice por qué', () => {
    state.list = ok(pageOf([]));
    state.spend = ok({ readings: 0, costUsd: 0, available: false });
    const { simulate } = setup();

    const button = screen.getByRole('button', { name: 'Leer ahora' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'El servicio de lectura no está configurado');
    fireEvent.click(button);
    expect(simulate.mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Lector sin configurar')).toBeInTheDocument();
  });

  it('el administrador general sin «Ver como» ve el aviso y no la lista', () => {
    state.perms = { needsDistributor: true, canWrite: false, writeHint: 'Elegí una distribuidora con «Ver como»' };
    state.list = ok(pageOf([]));
    setup();

    expect(screen.getByRole('button', { name: 'Leer ahora' })).toBeDisabled();
    expect(screen.getByText(/Elegí una distribuidora con «Ver como» para ver/)).toBeInTheDocument();
  });
});
