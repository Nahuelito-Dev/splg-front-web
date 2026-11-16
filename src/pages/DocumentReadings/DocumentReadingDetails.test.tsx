import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocumentReading } from '../../services/api/types';
import { failed, loading, mutation, ok, pageOf, renderPage } from '../../test/pageTest';
import { readingOf } from './documentReadingFixtures';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  reading: undefined as unknown,
  confirm: undefined as unknown,
  correct: undefined as unknown,
  reject: undefined as unknown,
  tasks: [] as unknown[],
  docsLoading: false,
}));

vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => state.perms,
  useBackToList: () => () => undefined,
}));
vi.mock('../../services/queries/documentReadings', () => ({
  useDocumentReading: () => state.reading,
  useConfirmDocumentReading: () => state.confirm,
  useCorrectDocumentReading: () => state.correct,
  useRejectDocumentReading: () => state.reject,
}));
vi.mock('../../services/queries/finance', () => ({
  useCashBoxOptions: () =>
    ok(
      pageOf([
        { cashBoxId: 'c-1', name: 'Caja central', isActive: true },
        { cashBoxId: 'c-2', name: 'Caja vieja', isActive: false },
      ]),
    ),
}));
vi.mock('../../services/queries/personnel', () => ({
  useEmployeeDocuments: () =>
    state.docsLoading
      ? loading()
      : ok({ employeeId: 'e-1', isLocked: false, lockReasons: [], tasks: state.tasks, missingPlans: [] }),
}));
vi.mock('../../services/queries/attachments', () => ({
  useAttachmentPreview: () => ok({ kind: 'url', url: 'https://archivos.test/recibo.pdf', expiresAt: null }),
  useAttachmentFile: () => mutation(),
}));
const notifications = vi.hoisted(() => ({ success: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../utils/notifications', () => ({ confirm: () => Promise.resolve(true), notify: notifications }));

import { DocumentReadingDetails } from './DocumentReadingDetails';

type Mut = ReturnType<typeof mutation>;
type Callbacks = { onSuccess?: (data: unknown) => void; onError?: (error: unknown) => void };

const answer = (m: Mut, outcome: { error?: unknown }) =>
  m.mutate.mockImplementation((_vars: unknown, callbacks?: unknown) => {
    const cb = callbacks as Callbacks;
    if (outcome.error) cb.onError?.(outcome.error);
    else cb.onSuccess?.({});
  });

const apiError = (status: number, message: string) =>
  Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status, data: { statusCode: status, message } },
  });

const setup = (reading: DocumentReading = readingOf()) => {
  state.reading = ok(reading);
  state.confirm = mutation();
  state.correct = mutation();
  state.reject = mutation();
  renderPage(<DocumentReadingDetails />, { url: '/document-readings/r-1', path: '/document-readings/:id' });
  return { confirm: state.confirm as Mut, correct: state.correct as Mut, reject: state.reject as Mut };
};

afterEach(() => {
  cleanup();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
  state.tasks = [];
  state.docsLoading = false;
  vi.clearAllMocks();
});

describe('DocumentReadingDetails', () => {
  it('mientras carga no muestra la ficha, y si falla permite reintentar', () => {
    state.reading = loading();
    renderPage(<DocumentReadingDetails />, { url: '/document-readings/r-1', path: '/document-readings/:id' });
    expect(screen.queryByText('Propuesta')).not.toBeInTheDocument();
    cleanup();

    const refetch = vi.fn();
    state.reading = failed(refetch);
    renderPage(<DocumentReadingDetails />, { url: '/document-readings/r-1', path: '/document-readings/:id' });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('muestra el archivo, lo leído al lado de lo que tiene el sistema y la diferencia', () => {
    setup(
      readingOf(
        {},
        {
          differences: [
            {
              field: 'destinatario',
              expected: 'La Segunda Cooperativa',
              read: 'Otra',
              message: 'El destinatario no coincide',
            },
          ],
        },
      ),
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Comprobante de pago' })).toBeInTheDocument();
    expect(screen.getByLabelText('Documento leído: recibo-noviembre.pdf')).toHaveAttribute(
      'data',
      'https://archivos.test/recibo.pdf',
    );
    const fields = screen.getByRole('list', { name: 'Datos leídos' });
    expect(within(fields).getByText('La Segunda Cooperativa')).toBeInTheDocument();
    expect(within(fields).getByText('El destinatario no coincide')).toBeInTheDocument();
    expect(screen.getByText('Comprobante de cuota listo para confirmar.')).toBeInTheDocument();
  });

  it('confirmar un pago pide la caja (sólo las activas) y la manda', async () => {
    const { confirm } = setup();
    answer(confirm, {});

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar la propuesta' });
    expect(within(dialog).queryByRole('option', { name: 'Caja vieja' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    expect(await within(dialog).findByText('Elegí la caja de la que sale el pago')).toBeInTheDocument();
    expect(confirm.mutate).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/Caja del pago/), { target: { value: 'c-1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(confirm.mutate).toHaveBeenCalledTimes(1));
    expect(confirm.mutate.mock.calls[0][0]).toEqual({ id: 'r-1', body: { cashBoxId: 'c-1' } });
    expect(notifications.success).toHaveBeenCalledWith('Propuesta confirmada');
  });

  it('un 409 al confirmar se muestra con el texto del back y el modal queda abierto', async () => {
    const { confirm } = setup(readingOf({}, { action: 'review' }));
    answer(confirm, { error: apiError(409, 'La propuesta cambió: volvé a abrirla') });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar la propuesta' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La propuesta cambió: volvé a abrirla');
    expect(confirm.mutate.mock.calls[0][0]).toEqual({ id: 'r-1', body: {} });
    expect(notifications.success).not.toHaveBeenCalled();
  });

  it('con diferencia de importe no se confirma tal cual: hay que corregir', () => {
    const { confirm } = setup(
      readingOf(
        {},
        { differences: [{ field: 'importe', expected: '40000.00', read: '38390.00', message: 'Difiere' }] },
      ),
    );

    const button = screen.getByRole('button', { name: 'Confirmar' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(confirm.mutate).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Hay diferencias en importe/).length).toBeGreaterThan(0);
  });

  it('corregir manda sólo lo cambiado, acepta el importe con diferencia y pide la caja', async () => {
    const { correct } = setup(
      readingOf(
        {},
        { differences: [{ field: 'importe', expected: '40000.00', read: '38390.00', message: 'Difiere' }] },
      ),
    );
    answer(correct, {});

    fireEvent.click(screen.getByRole('button', { name: 'Corregir' }));
    const dialog = await screen.findByRole('dialog', { name: 'Corregir y confirmar' });
    expect(within(dialog).getByLabelText(/Importe/)).toHaveValue('38390.00');
    fireEvent.change(within(dialog).getByLabelText(/Número de operación/), { target: { value: 'OP-78' } });
    fireEvent.change(within(dialog).getByLabelText(/Caja del pago/), { target: { value: 'c-1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Corregir y confirmar' }));

    await waitFor(() => expect(correct.mutate).toHaveBeenCalledTimes(1));
    expect(correct.mutate.mock.calls[0][0]).toEqual({
      id: 'r-1',
      body: { fields: { importe: '38390.00', numero_de_operacion: 'OP-78' }, cashBoxId: 'c-1' },
    });
    expect(notifications.success).toHaveBeenCalledWith('Propuesta corregida y confirmada');
  });

  it('corregir sin cambiar nada no llama al back y lo dice', async () => {
    const { correct } = setup(readingOf({}, { action: 'review' }));

    fireEvent.click(screen.getByRole('button', { name: 'Corregir' }));
    const dialog = await screen.findByRole('dialog', { name: 'Corregir y confirmar' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Corregir y confirmar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No cambiaste ningún dato: usá confirmar.');
    expect(correct.mutate).not.toHaveBeenCalled();
  });

  it('un importe mal escrito no se manda; un 400 del back se muestra con su texto', async () => {
    const { correct } = setup(readingOf({}, { action: 'review' }));
    answer(correct, { error: apiError(400, 'Importe: el valor «1,5» no es válido') });

    fireEvent.click(screen.getByRole('button', { name: 'Corregir' }));
    const dialog = await screen.findByRole('dialog', { name: 'Corregir y confirmar' });
    fireEvent.change(within(dialog).getByLabelText(/Importe/), { target: { value: '38.390,00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Corregir y confirmar' }));
    expect(await within(dialog).findByText(/Usá punto decimal/)).toBeInTheDocument();
    expect(correct.mutate).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/Importe/), { target: { value: '1.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Corregir y confirmar' }));
    expect(await within(dialog).findByText('Importe: el valor «1,5» no es válido')).toBeInTheDocument();
  });

  it('mientras llegan las tareas del legajo no se puede confirmar (no se manda sin elegir la tarea)', async () => {
    state.docsLoading = true;
    const reading = readingOf(
      {
        detectedType: 'licencia_de_conducir',
        expectedType: 'licencia_de_conducir',
        fields: [
          { nombre: 'documento', valor: '30111222', confianza: 'alta' },
          { nombre: 'vencimiento', valor: '2031-05-01', confianza: 'alta' },
        ],
      },
      { action: 'update_employee_document', ownerType: 'employee', ownerId: 'e-1' },
    );
    const { confirm } = setup(reading);
    state.docsLoading = true;

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar la propuesta' });
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirmar/ }));
    // El envío del formulario es asíncrono: se le da tiempo a que llegue (o no) a la mutación.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(confirm.mutate).not.toHaveBeenCalled();
  });

  it('un legajo con más de una tarea posible obliga a elegir cuál renovar', async () => {
    state.tasks = [
      {
        taskId: 't-1',
        status: 'scheduled',
        dueAt: '2026-12-01T00:00:00.000Z',
        plan: { name: 'Licencia', documentKind: 'driver_license' },
      },
      {
        taskId: 't-2',
        status: 'overdue',
        dueAt: '2026-10-01T00:00:00.000Z',
        plan: { name: 'Licencia', documentKind: 'driver_license' },
      },
    ];
    const reading = readingOf(
      {
        detectedType: 'licencia_de_conducir',
        expectedType: 'licencia_de_conducir',
        fields: [
          { nombre: 'documento', valor: '30111222', confianza: 'alta' },
          { nombre: 'vencimiento', valor: '2031-05-01', confianza: 'alta' },
        ],
      },
      { action: 'update_employee_document', ownerType: 'employee', ownerId: 'e-1' },
    );
    const { confirm } = setup(reading);
    answer(confirm, {});
    expect(screen.getByRole('link', { name: 'Legajo' })).toHaveAttribute(
      'href',
      '/employees/details/e-1?tab=documents',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar la propuesta' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    expect(await within(dialog).findByText('Elegí qué tarea del legajo se renueva')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/Tarea del legajo/), { target: { value: 't-2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(confirm.mutate).toHaveBeenCalledTimes(1));
    expect(confirm.mutate.mock.calls[0][0]).toEqual({ id: 'r-1', body: { fleetTaskId: 't-2' } });
  });

  it('documento distinto del legajo: sólo queda rechazar', () => {
    setup(
      readingOf(
        { detectedType: 'licencia_de_conducir' },
        {
          action: 'update_employee_document',
          ownerType: 'employee',
          differences: [{ field: 'documento', expected: '1', read: '2', message: 'Otro documento' }],
        },
      ),
    );

    expect(screen.getByText(/El documento leído no coincide con el legajo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Corregir' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Rechazar' })).not.toHaveAttribute('aria-disabled');
  });

  it('rechazar pide el motivo y lo manda', async () => {
    const { reject } = setup();
    answer(reject, {});

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rechazar la propuesta' });
    fireEvent.change(within(dialog).getByLabelText(/Motivo/), { target: { value: 'No es de esta cuota' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rechazar' }));

    await waitFor(() => expect(reject.mutate).toHaveBeenCalledTimes(1));
    expect(reject.mutate.mock.calls[0][0]).toEqual({ id: 'r-1', body: { reason: 'No es de esta cuota' } });
    expect(notifications.success).toHaveBeenCalledWith('Propuesta rechazada');
  });

  it('un 409 al rechazar («ya fue resuelta») se muestra con su texto', async () => {
    const { reject } = setup();
    answer(reject, { error: apiError(409, 'La propuesta ya fue resuelta') });

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rechazar la propuesta' });
    fireEvent.change(within(dialog).getByLabelText(/Motivo/), { target: { value: 'Duplicado' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rechazar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La propuesta ya fue resuelta');
  });

  it('una lectura ya decidida no ofrece decisiones y muestra qué se hizo', () => {
    setup(
      readingOf({
        status: 'corrected',
        decidedAt: '2026-11-11T13:00:00.000Z',
        decidedByUserId: 'u-1',
        executed: true,
        decisionNote: 'Pagada con recargo',
        corrections: [{ field: 'importe', read: '38390.00', value: '39000.00' }],
      }),
    );

    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    expect(screen.getByText('Corregida y confirmada')).toBeInTheDocument();
    expect(screen.getByText('Pagada con recargo')).toBeInTheDocument();
    expect(screen.getByText(/39\.000,00/)).toBeInTheDocument();
  });

  it('sin permiso de escritura las decisiones están bloqueadas con el motivo', () => {
    state.perms = { needsDistributor: false, canWrite: false, writeHint: 'Sólo lectura' };
    setup();

    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveAttribute('title', 'Sólo lectura');
    expect(screen.getByRole('button', { name: 'Rechazar' })).toHaveAttribute('aria-disabled', 'true');
  });
});
