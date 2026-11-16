import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { describeListStates, ok, renderPage } from '../../test/pageTest';
import { todayLocal } from './attendanceRules';

const state = vi.hoisted(() => ({
  attendance: vi.fn(),
  employees: vi.fn(),
  needsDistributor: false,
  canWrite: true,
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: undefined, needsDistributor: state.needsDistributor }),
}));
vi.mock('../../services/queries/employees', () => ({ useEmployees: () => state.employees() as unknown }));
vi.mock('../../services/queries/personnel', () => ({
  useAttendance: (...args: unknown[]) => state.attendance(...args) as unknown,
}));
vi.mock('./components/AttendanceFormModal', () => ({
  AttendanceFormModal: ({ open }: { open: boolean }) => (open ? <p>Registrar asistencia (formulario)</p> : null),
}));
vi.mock('./components/AttendanceCorrectModal', () => ({
  AttendanceCorrectModal: ({ attendance }: { attendance: { employeeName: string } | null }) =>
    attendance ? <p>Corregir la jornada de {attendance.employeeName}</p> : null,
}));

import { Attendance } from './Attendance';

const jornada = (over: Record<string, unknown> = {}) => ({
  attendanceId: 'a-1',
  employeeId: 'e-1',
  employeeName: 'Ana Pérez',
  employeeFileNumber: '0042',
  workDate: '2026-03-02',
  checkInAt: '2026-03-02T11:00:00.000Z',
  checkOutAt: '2026-03-02T19:00:00.000Z',
  isOpen: false,
  durationMinutes: 480,
  source: 'panel',
  ...over,
});
const lista = (rows: unknown[], over: Record<string, unknown> = {}) =>
  ok({ rows, total: rows.length, presentToday: 3, staleOpen: 1, ...over });

beforeEach(() => state.employees.mockReturnValue(ok({ rows: [], total: 0 })));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.needsDistributor = false;
  state.canWrite = true;
});

describeListStates({
  name: 'Asistencia',
  url: '/attendance',
  page: <Attendance />,
  setResult: (result) => state.attendance.mockReturnValue(result),
  withRow: () => lista([jornada()]),
  withoutRows: () => lista([]),
  rowText: 'Ana Pérez',
  emptyText: 'Todavía no hay asistencia registrada.',
  loadingLabel: 'Cargando jornadas',
});

describe('Asistencia: la grilla', () => {
  it('sin filtros pide el día de hoy y muestra presentes y jornadas sin cerrar', () => {
    state.attendance.mockReturnValue(lista([jornada()]));
    renderPage(<Attendance />, { url: '/attendance' });
    expect(state.attendance).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 0 }),
      { date: todayLocal(), employeeId: undefined, open: undefined },
      true,
    );
    expect(screen.getByText('Presentes hoy')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Jornadas sin cerrar')).toBeInTheDocument();
  });

  it('«sólo sin cerrar» sin día trae todas las abiertas, no sólo las de hoy', () => {
    state.attendance.mockReturnValue(lista([]));
    renderPage(<Attendance />, { url: '/attendance?open=true' });
    expect(state.attendance).toHaveBeenLastCalledWith(
      expect.anything(),
      { date: undefined, employeeId: undefined, open: true },
      true,
    );
  });

  it('con un día y un empleado en la URL los pide', () => {
    state.attendance.mockReturnValue(lista([]));
    renderPage(<Attendance />, { url: '/attendance?date=2026-03-02&employee=e-9&open=true' });
    expect(state.attendance).toHaveBeenLastCalledWith(
      expect.anything(),
      { date: '2026-03-02', employeeId: 'e-9', open: true },
      true,
    );
  });

  it('una jornada abierta se marca «Sin cerrar» y se puede corregir', () => {
    state.attendance.mockReturnValue(lista([jornada({ isOpen: true, checkOutAt: null, durationMinutes: null })]));
    renderPage(<Attendance />, { url: '/attendance' });
    expect(screen.getAllByText('Sin cerrar').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Corregir' }));
    expect(screen.getByText('Corregir la jornada de Ana Pérez')).toBeInTheDocument();
  });

  it('«Registrar asistencia» abre el formulario', () => {
    state.attendance.mockReturnValue(lista([]));
    renderPage(<Attendance />, { url: '/attendance' });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar asistencia' }));
    expect(screen.getByText('Registrar asistencia (formulario)')).toBeInTheDocument();
  });

  it('sin permiso de escritura no se puede corregir', () => {
    state.canWrite = false;
    state.attendance.mockReturnValue(lista([jornada()]));
    renderPage(<Attendance />, { url: '/attendance' });
    expect(screen.queryByRole('button', { name: 'Corregir' })).not.toBeInTheDocument();
  });

  it('un administrador general sin «Ver como» no consulta y lo explica', () => {
    state.needsDistributor = true;
    state.attendance.mockReturnValue(lista([]));
    renderPage(<Attendance />, { url: '/attendance' });
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(state.attendance).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), false);
  });
});
