import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, mutation, ok } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ documents: vi.fn(), create: vi.fn(), close: vi.fn() }));

vi.mock('../../../common/components/AttachmentsPanel', () => ({ AttachmentsPanel: () => <p>Archivos del legajo</p> }));
vi.mock('../../../services/queries/personnel', () => ({
  useEmployeeDocuments: () => state.documents() as unknown,
}));
vi.mock('../../../services/queries/fleet', () => ({
  useCreateFleetTask: () => state.create() as unknown,
  useCloseFleetTask: () => state.close() as unknown,
}));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn() },
}));

import type { Employee, FleetPlan, FleetTask } from '../../../services/api/types';
import { EmployeeDocumentFormModal } from './EmployeeDocumentFormModal';
import { EmployeeDocumentsTab } from './EmployeeDocumentsTab';

const EMPLEADO = { employeeId: 'e-1', status: 'active', deliveryId: 'dl-1' } as unknown as Employee;

const plan = (over: Partial<FleetPlan> = {}): FleetPlan =>
  ({
    planId: 'p-curso',
    name: 'Curso de mercancías peligrosas',
    subject: 'employee',
    criticality: 'blocking',
    documentKind: 'hazmat_driver_course',
    ...over,
  }) as FleetPlan;

const tarea = (over: Partial<FleetTask> = {}): FleetTask =>
  ({
    taskId: 't-1',
    planId: 'p-curso',
    plan: plan(),
    status: 'scheduled',
    dueAt: '2026-12-01T00:00:00.000Z',
    daysUntilDue: 12,
    expirationStatus: 'due_soon',
    details: { certificateNumber: '123/26', issuer: 'CNRT' },
    referenceNumber: null,
    ...over,
  }) as FleetTask;

const drawTab = (canWrite = true) =>
  render(
    <MemoryRouter>
      <EmployeeDocumentsTab employee={EMPLEADO} canWrite={canWrite} />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EmployeeDocumentsTab (CU-187)', () => {
  it('muestra una tarjeta por documento: el cargado con su estado y su detalle, y el que falta', () => {
    state.documents.mockReturnValue(
      ok({
        employeeId: 'e-1',
        isLocked: false,
        lockReasons: [],
        tasks: [tarea()],
        missingPlans: [plan({ planId: 'p-psico', name: 'Examen psicofísico', documentKind: 'psychophysical' })],
      }),
    );
    drawTab();
    expect(screen.getByText('Curso de mercancías peligrosas')).toBeInTheDocument();
    expect(screen.getByText('Por vencer')).toBeInTheDocument();
    expect(screen.getByText('Vence en 12 días')).toBeInTheDocument();
    expect(screen.getByText('123/26')).toBeInTheDocument();
    expect(screen.getByText('Examen psicofísico')).toBeInTheDocument();
    expect(screen.getByText('Falta cargar')).toBeInTheDocument();
    expect(screen.getByText('Archivos del legajo')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('avisa que queda inhabilitado cuando tiene documentación bloqueante vencida', () => {
    state.documents.mockReturnValue(
      ok({
        employeeId: 'e-1',
        isLocked: true,
        lockReasons: [
          'Curso de mercancías peligrosas: venció el 01/12/2026',
          'tiene una licencia aprobada que cubre el día de hoy',
        ],
        tasks: [tarea({ expirationStatus: 'expired', daysUntilDue: -3 })],
        missingPlans: [],
      }),
    );
    drawTab();
    expect(screen.getByRole('alert')).toHaveTextContent('No recibe pedidos');
    expect(screen.getByRole('alert')).toHaveTextContent('licencia aprobada que cubre el día de hoy');
    expect(screen.getByText('Venció hace 3 días')).toBeInTheDocument();
  });

  it('una tarea cerrada no cuenta como cargada: la tarjeta muestra la abierta', () => {
    state.documents.mockReturnValue(
      ok({
        employeeId: 'e-1',
        isLocked: false,
        lockReasons: [],
        tasks: [tarea({ taskId: 't-vieja', status: 'done', expirationStatus: null }), tarea()],
        missingPlans: [],
      }),
    );
    drawTab();
    expect(screen.getAllByText('Curso de mercancías peligrosas')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Ver tarea y adjuntos/ })).toHaveAttribute('href', '/fleet/tasks/t-1');
  });

  it('la licencia del perfil de reparto no se carga acá: manda a la ficha del chofer', () => {
    state.documents.mockReturnValue(
      ok({
        employeeId: 'e-1',
        isLocked: false,
        lockReasons: [],
        tasks: [],
        missingPlans: [
          plan({ planId: 'p-lic', name: 'Licencia de conducir', subject: 'driver', documentKind: 'driver_license' }),
        ],
      }),
    );
    drawTab();
    expect(screen.queryByRole('button', { name: 'Cargar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se carga en la ficha del chofer' })).toHaveAttribute(
      'href',
      '/deliveries/details/dl-1',
    );
  });

  it('«Cargar» abre el formulario del documento que falta', () => {
    state.documents.mockReturnValue(
      ok({ employeeId: 'e-1', isLocked: false, lockReasons: [], tasks: [], missingPlans: [plan()] }),
    );
    state.create.mockReturnValue(mutation());
    state.close.mockReturnValue(mutation());
    drawTab();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }));
    expect(screen.getByRole('dialog', { name: 'Cargar: Curso de mercancías peligrosas' })).toBeInTheDocument();
  });

  it('sin permiso de escritura no se puede cargar ni renovar', () => {
    state.documents.mockReturnValue(
      ok({ employeeId: 'e-1', isLocked: false, lockReasons: [], tasks: [tarea()], missingPlans: [] }),
    );
    drawTab(false);
    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('un error del back se dice con Reintentar', () => {
    const refetch = vi.fn();
    state.documents.mockReturnValue(failed(refetch));
    drawTab();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('EmployeeDocumentFormModal (CU-183 a CU-185)', () => {
  const rellenarCurso = () => {
    fireEvent.change(screen.getByLabelText(/Número de certificado/), { target: { value: '999/26' } });
    fireEvent.change(screen.getByLabelText(/Emisor/), { target: { value: 'CNRT' } });
    fireEvent.change(screen.getByLabelText(/Vence el/), { target: { value: '2027-05-10' } });
  };

  it('pide el detalle propio del tipo y el vencimiento antes de llamar al back', async () => {
    const create = mutation();
    state.create.mockReturnValue(create);
    state.close.mockReturnValue(mutation());
    render(<EmployeeDocumentFormModal open onClose={vi.fn()} employeeId="e-1" plan={plan()} previous={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar documento' }));
    expect(await screen.findByText('Ingresá número de certificado')).toBeInTheDocument();
    expect(screen.getByText('Ingresá emisor')).toBeInTheDocument();
    expect(screen.getByText('Ingresá la fecha de vencimiento')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('el alta manda el empleado, el plan, el vencimiento y el detalle', async () => {
    const create = mutation();
    state.create.mockReturnValue(create);
    state.close.mockReturnValue(mutation());
    render(<EmployeeDocumentFormModal open onClose={vi.fn()} employeeId="e-1" plan={plan()} previous={null} />);
    rellenarCurso();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar documento' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(create.mutate.mock.calls[0][0]).toEqual({
      planId: 'p-curso',
      employeeId: 'e-1',
      dueAt: '2027-05-10',
      details: { certificateNumber: '999/26', issuer: 'CNRT' },
      notes: undefined,
    });
  });

  it('un plan sin detalle (ART genérica) sólo pide el vencimiento', async () => {
    const create = mutation();
    state.create.mockReturnValue(create);
    state.close.mockReturnValue(mutation());
    render(
      <EmployeeDocumentFormModal
        open
        onClose={vi.fn()}
        employeeId="e-1"
        plan={plan({ documentKind: 'generic' })}
        previous={null}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Vence el/), { target: { value: '2027-05-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar documento' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(create.mutate.mock.calls[0][0]).toMatchObject({ details: undefined, dueAt: '2027-05-10' });
  });

  it('renovar carga el documento nuevo y recién después cierra el anterior', async () => {
    const create = mutation();
    create.mutate.mockImplementation((_vars: unknown, options?: unknown) =>
      (options as { onSuccess: () => void }).onSuccess(),
    );
    const close = mutation();
    state.create.mockReturnValue(create);
    state.close.mockReturnValue(close);
    render(<EmployeeDocumentFormModal open onClose={vi.fn()} employeeId="e-1" plan={plan()} previous={tarea()} />);
    expect(screen.getByLabelText(/Número de certificado/)).toHaveValue('123/26');
    fireEvent.change(screen.getByLabelText(/Vence el/), { target: { value: '2027-05-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Renovar documento' }));
    await waitFor(() => expect(close.mutate).toHaveBeenCalled());
    expect(close.mutate.mock.calls[0][0]).toMatchObject({ id: 't-1' });
    expect(create.mutate.mock.invocationCallOrder[0]).toBeLessThan(close.mutate.mock.invocationCallOrder[0]);
  });

  it('si no se pudo cargar el documento nuevo, el anterior no se cierra', async () => {
    const create = mutation();
    create.mutate.mockImplementation((_vars: unknown, options?: unknown) =>
      (options as { onError: (e: unknown) => void }).onError(new Error('boom')),
    );
    const close = mutation();
    state.create.mockReturnValue(create);
    state.close.mockReturnValue(close);
    render(<EmployeeDocumentFormModal open onClose={vi.fn()} employeeId="e-1" plan={plan()} previous={tarea()} />);
    fireEvent.change(screen.getByLabelText(/Vence el/), { target: { value: '2027-05-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Renovar documento' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(close.mutate).not.toHaveBeenCalled();
  });
});
