import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FleetTask } from '../../services/api/types';

const permissions = vi.hoisted(() => ({ needsDistributor: false }));
const carsCall = vi.hoisted(() => vi.fn());
const pickedEmployee = vi.hoisted(() => vi.fn());
const carDocs = vi.hoisted(() => ({ locked: false }));

const task = (id: string, name: string, fields: Partial<FleetTask> = {}): FleetTask =>
  ({
    taskId: id,
    plan: { name },
    status: 'scheduled',
    dueAt: '2026-12-01',
    expirationStatus: 'current',
    daysUntilDue: 40,
    referenceNumber: null,
    ...fields,
  }) as unknown as FleetTask;

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    // Las dos salen de lo mismo: sólo el administrador general sin distribuidora elegida no puede escribir.
    needsDistributor: permissions.needsDistributor,
    canWrite: !permissions.needsDistributor,
    writeHint: permissions.needsDistributor ? 'Elegí una distribuidora con «Ver como» para crear' : undefined,
  }),
}));
vi.mock('../../services/queries/cars', () => ({
  useCars: (options: unknown) => ({
    ...(carsCall(options) as object),
    data: [
      { car_id: 'car-1', car_brand: 'Fiat', car_model: 'Fiorino', car_patent: 'AB123CD' },
      { car_id: 'car-2', car_brand: 'Ford', car_model: 'Transit', car_patent: 'ZZ999ZZ' },
    ],
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../services/queries/employees', () => ({
  useEmployee: (id: string | undefined) => pickedEmployee(id) as unknown,
  useEmployees: () => ({
    data: {
      rows: [{ employeeId: 'emp-1', firstName: 'Ana', lastName: 'Pérez', fileNumber: '0042' }],
      total: 1,
    },
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../services/queries/fleet', () => ({
  useCarDocuments: (carId: string | undefined) => ({
    data: carId
      ? {
          carId,
          isLocked: carDocs.locked,
          tasks: [
            task('t-vigente', 'Seguro'),
            task('t-vencido', 'VTV', { expirationStatus: 'expired', daysUntilDue: -3, dueAt: '2026-09-01' }),
          ],
        }
      : undefined,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../services/queries/personnel', () => ({
  useEmployeeDocuments: (employeeId: string | undefined) => ({
    data: employeeId
      ? {
          employeeId,
          isLocked: true,
          lockReasons: ['Licencia vencida'],
          tasks: [task('t-lic', 'Licencia')],
          missingPlans: [],
        }
      : undefined,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('./components/FleetTaskAttachments', () => ({
  FleetTaskAttachments: ({ taskId, canWrite }: { taskId: string; canWrite: boolean }) => (
    <p>{`archivos de ${taskId}${canWrite ? ' (editable)' : ' (solo lectura)'}`}</p>
  ),
}));
vi.mock('../../common/components/AttachmentsPanel', () => ({
  AttachmentsPanel: ({ ownerType, title }: { ownerType: string; title: string }) => <p>{`${title} de ${ownerType}`}</p>,
}));

import { FleetFiles } from './FleetFiles';

const renderPage = (url = '/fleet/files') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <FleetFiles />
    </MemoryRouter>,
  );

beforeEach(() => {
  permissions.needsDistributor = false;
  pickedEmployee.mockReturnValue({ data: undefined });
  carDocs.locked = false;
});
afterEach(cleanup);

describe('FleetFiles', () => {
  it('lista los vehículos y pide elegir uno antes de mostrar nada', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Fiat Fiorino/ })).toBeInTheDocument();
    expect(screen.getByText('Elegí un vehículo')).toBeInTheDocument();
  });

  it('el buscador de vehículos filtra por patente', () => {
    renderPage();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar vehículo' }), { target: { value: 'zz999' } });
    expect(screen.getByRole('button', { name: /Ford Transit/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fiat Fiorino/ })).not.toBeInTheDocument();
  });

  it('al elegir un vehículo muestra sus documentos con lo vencido primero y abre sus archivos', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Fiat Fiorino/ }));
    const titles = screen.getAllByRole('button', { name: /VTV|Seguro/ }).map((button) => button.textContent ?? '');
    expect(titles[0]).toContain('VTV');
    expect(screen.getByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText(/Venció hace 3 días/)).toBeInTheDocument();
    // El primero (el vencido) llega desplegado; el otro se despliega a pedido.
    expect(screen.getByText('archivos de t-vencido (editable)')).toBeInTheDocument();
    expect(screen.queryByText(/archivos de t-vigente/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Seguro/ }));
    expect(screen.getByText('archivos de t-vigente (editable)')).toBeInTheDocument();
  });

  it('con distribuidora elegida los archivos son editables', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Fiat Fiorino/ }));
    expect(screen.getByText('archivos de t-vencido (editable)')).toBeInTheDocument();
  });

  it('avisa si el vehículo está inhabilitado por documentación vencida', () => {
    carDocs.locked = true;
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Fiat Fiorino/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('No puede salir a operar');
  });

  it('en Personal muestra los legajos, sus documentos, el motivo del bloqueo y los archivos del legajo', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Personal' }));
    fireEvent.click(screen.getByRole('button', { name: /Ana Pérez/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('No recibe pedidos hasta que se resuelva: Licencia vencida');
    expect(screen.getByText('Archivos del legajo de employee')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ana Pérez · Legajo 0042/ })).toBeInTheDocument();
  });

  it('el vehículo elegido queda en la URL: al recargar sigue abierto', () => {
    renderPage('/fleet/files?owner=car-2');
    expect(
      within(screen.getByRole('heading', { level: 2 }).parentElement as HTMLElement).getByText(/Ford Transit/),
    ).toBeInTheDocument();
  });

  it('el administrador general sin distribuidora elegida no ve listas: pide «Ver como»', () => {
    permissions.needsDistributor = true;
    renderPage();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    // Sin distribuidora la API contesta 400: ni siquiera se dispara la consulta de vehículos.
    expect(carsCall).toHaveBeenLastCalledWith({ enabled: false });
  });

  it('la lista de vehículos sólo se pide en la pestaña Vehículos', () => {
    renderPage();
    expect(carsCall).toHaveBeenLastCalledWith({ enabled: true });
    fireEvent.click(screen.getByRole('tab', { name: 'Personal' }));
    expect(carsCall).toHaveBeenLastCalledWith({ enabled: false });
  });

  it('un legajo elegido que no está en la página listada se pide por su id y sigue abierto', () => {
    pickedEmployee.mockImplementation((id?: string) => ({
      data: id ? { employeeId: id, firstName: 'Zoe', lastName: 'Fuera', fileNumber: '0099' } : undefined,
    }));
    renderPage('/fleet/files?subject=employee&owner=emp-99');
    expect(screen.getByRole('heading', { name: /Zoe Fuera · Legajo 0099/ })).toBeInTheDocument();
  });
});
