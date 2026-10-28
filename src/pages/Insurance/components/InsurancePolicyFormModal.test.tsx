import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mutation } from '../../../test/pageTest';

const create = vi.hoisted(() => ({ current: undefined as unknown }));
const warn = vi.hoisted(() => vi.fn());
const info = vi.hoisted(() => vi.fn());

vi.mock('../../../services/queries/insurance', () => ({
  useCreateInsurancePolicy: () => create.current,
  useUpdateInsurancePolicy: () => ({ mutate: vi.fn(), isPending: false }),
  useInsurerOptions: () => ({ data: { data: [{ insurerId: 'i-1', name: 'Sancor Seguros' }] } }),
  useCreateInsurer: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateInsurer: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn(), info, warn },
}));
vi.mock('../../../utils/format', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  argentinaDay: () => '2026-10-28',
}));

import { InsurancePolicyFormModal } from './InsurancePolicyFormModal';

const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fill = () => {
  fireEvent.change(screen.getByRole('combobox', { name: /Aseguradora/ }), { target: { value: 'i-1' } });
  type(/Número de póliza/, 'POL-123');
  type(/Cobertura/, 'Todo riesgo');
  type(/Vigente hasta/, '2027-10-28');
  type(/Importe de cada cuota/, '29958');
  type(/Código de pago/, '007012');
};

beforeEach(() => {
  create.current = mutation();
  warn.mockReset();
  info.mockReset();
});
afterEach(cleanup);

describe('InsurancePolicyFormModal (alta)', () => {
  it('por defecto 6 cuotas con 5 días de gracia, y las exige completas', async () => {
    render(<InsurancePolicyFormModal open onClose={vi.fn()} carId="c-1" policy={null} />);
    expect(screen.getByLabelText(/Cantidad de cuotas/)).toHaveValue(6);
    expect(screen.getByLabelText(/Días de gracia/)).toHaveValue(5);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Elegí la aseguradora')).toBeInTheDocument();
    expect((create.current as ReturnType<typeof mutation>).mutate).not.toHaveBeenCalled();
  });

  it('muestra la vista previa de las fechas de las cuotas antes de guardar', async () => {
    render(<InsurancePolicyFormModal open onClose={vi.fn()} carId="c-1" policy={null} />);
    type(/Importe de cada cuota/, '1000');
    type(/Primer vencimiento/, '2027-01-31');
    type(/Cantidad de cuotas/, '3');
    type(/Días de gracia/, '0');
    const preview = await screen.findByLabelText('Vista previa de las cuotas');
    const items = within(preview).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveTextContent('Cuota 2/3');
    expect(items[1]).toHaveTextContent('28 feb 2027');
  });

  it('Guardar manda la póliza con el plan de cuotas y avisa si Flota no se sincronizó', async () => {
    const m = create.current as ReturnType<typeof mutation>;
    m.mutate.mockImplementation((_v: unknown, options?: unknown) =>
      (options as { onSuccess: (r: unknown) => void }).onSuccess({
        fleet: { synced: false, taskId: null, reason: 'El vehículo no tiene seguro en Flota' },
      }),
    );
    const onClose = vi.fn();
    render(<InsurancePolicyFormModal open onClose={onClose} carId="c-1" policy={null} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(m.mutate).toHaveBeenCalledTimes(1));
    expect(m.mutate.mock.calls[0][0]).toEqual({
      scope: 'insurance-policy:c-1',
      body: {
        carId: 'c-1',
        insurerId: 'i-1',
        policyNumber: 'POL-123',
        coverage: 'Todo riesgo',
        validFrom: '2026-10-28',
        validTo: '2027-10-28',
        paymentCode: '007012',
        installments: { count: 6, amount: 29958, firstDueDate: '2026-10-28', graceDays: 5 },
      },
    });
    expect(warn).toHaveBeenCalledWith('El vehículo no tiene seguro en Flota');
    expect(onClose).toHaveBeenCalled();
  });

  it('con fleet.pending avisa que pasa a Flota al empezar la póliza, sin advertencia', async () => {
    const m = create.current as ReturnType<typeof mutation>;
    m.mutate.mockImplementation((_v: unknown, options?: unknown) =>
      (options as { onSuccess: (r: unknown) => void }).onSuccess({
        fleet: { synced: false, pending: true, taskId: null, reason: null },
      }),
    );
    render(<InsurancePolicyFormModal open onClose={vi.fn()} carId="c-1" policy={null} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(info).toHaveBeenCalledWith('El vencimiento pasa a Flota cuando empiece la póliza'));
    expect(warn).not.toHaveBeenCalled();
  });

  it('la vigencia tiene que terminar estrictamente después de empezar', async () => {
    render(<InsurancePolicyFormModal open onClose={vi.fn()} carId="c-1" policy={null} />);
    fill();
    type(/Vigente hasta/, '2026-10-28');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El fin tiene que ser posterior al inicio')).toBeInTheDocument();
  });

  it('marca el plan que se sale de la vigencia y bloquea Guardar', async () => {
    render(<InsurancePolicyFormModal open onClose={vi.fn()} carId="c-1" policy={null} />);
    fill();
    type(/Vigente hasta/, '2027-02-28');
    expect(await screen.findByText(/La última cuota vence después de que vence la póliza/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    type(/Primer vencimiento/, '2026-10-01');
    expect(await screen.findByText(/La primera cuota vence antes de que empiece la póliza/)).toBeInTheDocument();
  });

  it('el importe de la cuota admite hasta 2 decimales', async () => {
    render(<InsurancePolicyFormModal open onClose={vi.fn()} carId="c-1" policy={null} />);
    fill();
    type(/Importe de cada cuota/, '10.555');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Hasta 2 decimales')).toBeInTheDocument();
  });
});
