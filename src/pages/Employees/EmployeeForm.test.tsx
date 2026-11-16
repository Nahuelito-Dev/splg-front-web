import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { renderRoutes } from '../../test/renderRoutes';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok } from '../../test/pageTest';
import type { Employee } from '../../services/api/types';

const permissions = vi.hoisted(() => ({ canWrite: true }));
const queries = vi.hoisted(() => ({
  employee: vi.fn(),
  positions: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

const notifySuccess = vi.hoisted(() => vi.fn());
vi.mock('../../utils/notifications', () => ({
  notify: { success: notifySuccess, error: vi.fn(), info: vi.fn() },
  confirm: vi.fn(),
  dismissConfirm: vi.fn(),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    canWrite: permissions.canWrite,
    writeHint: permissions.canWrite ? undefined : 'Elegí una distribuidora con «Ver como» para crear',
  }),
}));
vi.mock('../../services/queries/employees', () => ({
  useEmployee: (...args: unknown[]) => queries.employee(...args) as unknown,
  useJobPositions: (...args: unknown[]) => queries.positions(...args) as unknown,
  useCreateEmployee: () => queries.create() as unknown,
  useUpdateEmployee: () => queries.update() as unknown,
}));

import { EmployeeForm } from './EmployeeForm';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  permissions.canWrite = true;
});

const POSITIONS = [{ positionId: 'p-1', name: 'Chofer', category: 'driver', isActive: true, activeEmployees: 1 }];
const EMPLOYEE = {
  employeeId: 'e-1',
  fileNumber: '0042',
  firstName: 'Ana',
  lastName: 'Pérez',
  position: { positionId: 'p-1', name: 'Chofer' },
  documentType: 'dni',
  documentNumber: '30123456',
  hireDate: '2026-03-01',
  employmentType: 'permanent',
  cuil: null,
  birthDate: null,
  phone: null,
  personalEmail: null,
  addressLine: null,
  city: null,
  province: null,
  postalCode: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  emergencyContactRelationship: null,
  notes: null,
} as unknown as Employee;

/** «Nombre» está también en el contacto de emergencia: el del legajo es el primero. */
const firstName = () => screen.getAllByLabelText(/^Nombre/)[0];

const renderAt = (url: string) =>
  renderRoutes(
    <>
      <Route path="/employees/new" element={<EmployeeForm />} />
      <Route path="/employees/:id/edit" element={<EmployeeForm />} />
      <Route path="/employees" element={<p>lista de legajos</p>} />
      <Route path="/employees/details/:id" element={<p>ficha del legajo</p>} />
    </>,
    [url],
  );

const setup = () => {
  queries.employee.mockReturnValue(ok(undefined));
  queries.positions.mockReturnValue(ok(POSITIONS));
  const create = mutation({
    mutate: vi.fn((_body: unknown, options?: { onSuccess?: (e: unknown) => void }) =>
      options?.onSuccess?.({ employeeId: 'e-9' }),
    ),
  });
  const update = mutation({
    mutate: vi.fn((_vars: unknown, options?: { onSuccess?: (e: unknown) => void }) => options?.onSuccess?.(EMPLOYEE)),
  });
  queries.create.mockReturnValue(create);
  queries.update.mockReturnValue(update);
  return { create, update };
};

describe('EmployeeForm', () => {
  it('el alta se arma en secciones con el título «Nuevo legajo»', () => {
    setup();
    renderAt('/employees/new');
    expect(screen.getByRole('heading', { level: 1, name: 'Nuevo legajo' })).toBeInTheDocument();
    for (const section of ['Datos personales', 'Datos laborales', 'Contacto y domicilio', 'Contacto de emergencia']) {
      expect(screen.getByRole('heading', { level: 2, name: section })).toBeInTheDocument();
    }
    expect(screen.getByLabelText(/Número de legajo/)).not.toBeRequired();
  });

  it('enviar vacío muestra los errores y no llama a la API; el foco va al primer campo con error', async () => {
    const { create } = setup();
    renderAt('/employees/new');
    fireEvent.click(screen.getByRole('button', { name: 'Crear legajo' }));
    expect(await screen.findByText('Ingresá el nombre')).toBeInTheDocument();
    expect(screen.getByText('Ingresá el apellido')).toBeInTheDocument();
    expect(screen.getByText('Elegí el puesto')).toBeInTheDocument();
    expect(screen.getByText('Ingresá la fecha de ingreso')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
    await waitFor(() => expect(firstName()).toHaveFocus());
  });

  it('un CUIL con el dígito verificador mal se rechaza antes de enviar (lo valida el back)', async () => {
    const { create } = setup();
    renderAt('/employees/new');
    fireEvent.change(firstName(), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/^Apellido/), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText(/Número de documento/), { target: { value: '30123456' } });
    fireEvent.change(screen.getByLabelText(/^Puesto/), { target: { value: 'p-1' } });
    fireEvent.change(screen.getByLabelText(/Fecha de ingreso/), { target: { value: '2026-03-01' } });
    fireEvent.change(screen.getByLabelText('CUIL'), { target: { value: '20123456780' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear legajo' }));
    expect(await screen.findByText(/dígito verificador/)).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('el alta manda el mismo cuerpo que el modal (vacíos como null) y va a la ficha del legajo creado', async () => {
    const { create } = setup();
    renderAt('/employees/new');
    fireEvent.change(firstName(), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/^Apellido/), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText(/Número de documento/), { target: { value: '30123456' } });
    fireEvent.change(screen.getByLabelText(/^Puesto/), { target: { value: 'p-1' } });
    fireEvent.change(screen.getByLabelText(/Fecha de ingreso/), { target: { value: '2026-03-01' } });
    fireEvent.change(screen.getByLabelText('CUIL'), { target: { value: '20123456786' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear legajo' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(create.mutate.mock.calls[0][0]).toEqual({
      firstName: 'Ana',
      lastName: 'Pérez',
      positionId: 'p-1',
      documentType: 'dni',
      documentNumber: '30123456',
      hireDate: '2026-03-01',
      employmentType: 'permanent',
      cuil: '20123456786',
      birthDate: null,
      phone: null,
      personalEmail: null,
      addressLine: null,
      city: null,
      province: null,
      postalCode: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      emergencyContactRelationship: null,
      notes: null,
    });
    expect(await screen.findByText('ficha del legajo')).toBeInTheDocument();
    expect(notifySuccess).toHaveBeenCalledWith('Legajo creado');
  });

  it('la edición carga el legajo, pide el número de legajo, deshabilita Guardar sin cambios y vuelve a la ficha', async () => {
    const { update } = setup();
    queries.employee.mockReturnValue(ok(EMPLOYEE));
    renderAt('/employees/e-1/edit');
    expect(screen.getByRole('heading', { level: 1, name: 'Editar legajo' })).toBeInTheDocument();
    expect(firstName()).toHaveValue('Ana');
    expect(screen.getByLabelText(/Número de legajo/)).toBeRequired();
    const save = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(save).toBeDisabled();
    fireEvent.change(firstName(), { target: { value: 'Anita' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toMatchObject({
      id: 'e-1',
      body: { firstName: 'Anita', fileNumber: '0042', phone: null },
    });
    expect(await screen.findByText('ficha del legajo')).toBeInTheDocument();
  });

  it('mientras carga el legajo muestra el estado de carga y si falla permite reintentar', () => {
    setup();
    queries.employee.mockReturnValue(loading());
    renderAt('/employees/e-1/edit');
    expect(screen.getByRole('status')).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    queries.employee.mockReturnValue(failed(refetch));
    renderAt('/employees/e-1/edit');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('no dibuja el formulario hasta tener los puestos: un select no conserva un valor cuyas opciones llegan después', () => {
    setup();
    queries.positions.mockReturnValue(loading());
    queries.employee.mockReturnValue(ok(EMPLOYEE));
    renderAt('/employees/e-1/edit');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Puesto/)).not.toBeInTheDocument();
  });

  it('al pasar de la edición de un legajo a la de otro, el formulario se arma con el segundo y guarda su id', async () => {
    const { update } = setup();
    const other = { ...EMPLOYEE, employeeId: 'e-2', firstName: 'Berta', fileNumber: '0043' } as Employee;
    queries.employee.mockImplementation((id: string) => ok(id === 'e-1' ? EMPLOYEE : other));
    const { router } = renderAt('/employees/e-1/edit');
    expect(firstName()).toHaveValue('Ana');
    await act(() => router.navigate('/employees/e-2/edit'));
    await waitFor(() => expect(firstName()).toHaveValue('Berta'));
    fireEvent.change(firstName(), { target: { value: 'Berta B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toMatchObject({
      id: 'e-2',
      body: { firstName: 'Berta B', fileNumber: '0043' },
    });
  });

  it('si fallan los puestos lo dice con «Reintentar» y no dibuja el formulario', () => {
    setup();
    const refetch = vi.fn();
    queries.positions.mockReturnValue({ ...failed(refetch), refetch });
    renderAt('/employees/new');
    expect(screen.queryByLabelText(/^Puesto/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('un error de recarga de los puestos con datos en caché no desmonta el formulario: avisa en línea y reintenta', () => {
    setup();
    const refetch = vi.fn();
    queries.employee.mockReturnValue(ok(EMPLOYEE));
    queries.positions.mockReturnValue({ ...ok(POSITIONS), error: new Error('boom'), isError: true, refetch });
    renderAt('/employees/e-1/edit');
    fireEvent.change(firstName(), { target: { value: 'Cambio sin guardar' } });
    expect(firstName()).toHaveValue('Cambio sin guardar');
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos actualizar los puestos');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('un error de recarga del legajo con datos en caché tampoco desmonta el formulario', () => {
    setup();
    const refetch = vi.fn();
    queries.employee.mockReturnValue({ ...ok(EMPLOYEE), error: new Error('boom'), refetch });
    renderAt('/employees/e-1/edit');
    expect(firstName()).toHaveValue('Ana');
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos actualizar el legajo');
  });

  it('en edición el puesto actual tiene su opción aunque la lista no lo traiga', () => {
    setup();
    queries.employee.mockReturnValue(ok(EMPLOYEE));
    queries.positions.mockReturnValue(ok([]));
    renderAt('/employees/e-1/edit');
    const select = screen.getByLabelText<HTMLSelectElement>(/^Puesto/);
    expect(select.value).toBe('p-1');
    expect(select.options[select.selectedIndex].textContent).toBe('Chofer');
  });

  it('el administrador general sin distribuidora elegida no ve el formulario', () => {
    setup();
    permissions.canWrite = false;
    renderAt('/employees/new');
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Nombre/)).not.toBeInTheDocument();
  });
});
