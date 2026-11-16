import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok } from '../../../test/pageTest';

const insurance = vi.hoisted(() => ({ result: undefined as unknown, cancel: undefined as unknown }));
const fileSource = vi.hoisted(() => ({ mutate: vi.fn<[unknown], void>(), isPending: false }));
const openFileSource = vi.hoisted(() => vi.fn());
const notifyWarn = vi.hoisted(() => vi.fn());
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: notifyWarn },
}));

vi.mock('../../../services/queries/insurance', () => ({
  useCarInsurance: () => insurance.result,
  useCancelInsurancePolicy: () => insurance.cancel,
}));
vi.mock('../../../services/queries/attachments', () => ({ useAttachmentFile: () => fileSource }));
vi.mock('../../../utils/fileSource', () => ({ openFileSource }));
vi.mock('../../../utils/format', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  argentinaDay: () => '2026-10-28',
}));
vi.mock('./InstallmentPaymentModal', () => ({
  InstallmentPaymentModal: ({ installment }: { installment: { label: string } | null }) =>
    installment ? <p>Modal de pago {installment.label}</p> : null,
}));
vi.mock('./InsurancePolicyFormModal', () => ({
  InsurancePolicyFormModal: ({ open, policy }: { open: boolean; policy: unknown }) =>
    open ? <p>{policy ? 'Modal editar póliza' : 'Modal cargar póliza'}</p> : null,
}));

import { CarInsuranceTab } from './CarInsuranceTab';

const installment = (over: Record<string, unknown>) => ({
  installmentId: 'q',
  policyId: 'p-1',
  number: 1,
  total: 6,
  label: '1/6',
  dueDate: '2026-12-10',
  graceUntil: '2026-12-15',
  amount: 29958,
  status: 'pending',
  paidAt: null,
  paidAmount: null,
  operationNumber: null,
  cashMovementId: null,
  receiptAttachmentId: null,
  ...over,
});

const POLICY = {
  policyId: 'p-1',
  carId: 'c-1',
  insurer: { insurerId: 'i-1', name: 'Sancor Seguros', paymentUrl: 'https://pagos.sancor.test/cuota' },
  policyNumber: 'POL-123',
  coverage: 'Todo riesgo',
  validFrom: '2026-06-22',
  validTo: '2027-06-22',
  paymentCode: '0070123456789',
  status: 'active',
  installments: [
    installment({
      installmentId: 'q-paga',
      label: '1/6',
      number: 1,
      status: 'paid',
      paidAt: '2026-07-10T15:00:00Z',
      paidAmount: 29958,
      cashMovementId: 'mov-abcdef123456',
      receiptAttachmentId: 'att-1',
      dueDate: '2026-07-10',
      graceUntil: '2026-07-15',
    }),
    installment({
      installmentId: 'q-vencida',
      label: '2/6',
      number: 2,
      dueDate: '2026-10-10',
      graceUntil: '2026-10-15',
    }),
    installment({
      installmentId: 'q-gracia',
      label: '3/6',
      number: 3,
      dueDate: '2026-10-26',
      graceUntil: '2026-10-31',
    }),
    installment({
      installmentId: 'q-pronto',
      label: '4/6',
      number: 4,
      dueDate: '2026-11-02',
      graceUntil: '2026-11-07',
    }),
    installment({ installmentId: 'q-lejos', label: '5/6', number: 5, dueDate: '2026-12-10', graceUntil: '2026-12-15' }),
  ],
};

const renderTab = (canWrite = true) =>
  render(
    <MemoryRouter>
      <CarInsuranceTab carId="c-1" canWrite={canWrite} />
    </MemoryRouter>,
  );

beforeEach(() => {
  insurance.cancel = mutation();
  fileSource.mutate.mockReset();
  openFileSource.mockReset();
});
afterEach(cleanup);

describe('CarInsuranceTab', () => {
  it('con póliza muestra aseguradora, número, cobertura, vigencia y código de pago', () => {
    insurance.result = ok({ carId: 'c-1', current: POLICY, history: [] });
    renderTab();
    expect(screen.getByText('Sancor Seguros')).toBeInTheDocument();
    expect(screen.getByText('POL-123')).toBeInTheDocument();
    expect(screen.getByText(/Todo riesgo/)).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
    expect(screen.getByText('0070123456789')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Enlace de pago de la aseguradora/ })).toHaveAttribute(
      'href',
      'https://pagos.sancor.test/cuota',
    );
  });

  it('cada cuota muestra su estado: vencida es peligro, en gracia y por vencer avisan', () => {
    insurance.result = ok({ carId: 'c-1', current: POLICY, history: [] });
    renderTab();
    const rows = screen.getByRole('list', { name: 'Cuotas del seguro' });
    expect(rows).toHaveTextContent('Cuota 1/6');
    expect(screen.getByText('Paga')).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
    expect(screen.getByText('En gracia')).toBeInTheDocument();
    expect(screen.getByText('Vence en 5 días')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('Pagar abre el enlace de la aseguradora en otra pestaña', () => {
    insurance.result = ok({ carId: 'c-1', current: POLICY, history: [] });
    renderTab();
    const pagar = screen.getAllByRole('link', { name: 'Pagar (se abre en otra pestaña)' });
    expect(pagar).toHaveLength(4);
    expect(pagar[0]).toHaveAttribute('href', 'https://pagos.sancor.test/cuota');
    expect(pagar[0]).toHaveAttribute('target', '_blank');
    expect(pagar[0]).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('Registrar pago abre el modal de esa cuota', () => {
    insurance.result = ok({ carId: 'c-1', current: POLICY, history: [] });
    renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: 'Registrar pago' })[3]);
    expect(screen.getByText('Modal de pago 5/6')).toBeInTheDocument();
  });

  it('la cuota paga ofrece el comprobante y el movimiento de caja, no Pagar', () => {
    insurance.result = ok({ carId: 'c-1', current: POLICY, history: [] });
    renderTab();
    expect(screen.getByRole('link', { name: /Movimiento de caja #123456/ })).toHaveAttribute(
      'href',
      '/finance/movements',
    );
    fireEvent.click(screen.getByRole('button', { name: /Ver comprobante/ }));
    expect(fileSource.mutate.mock.calls[0][0]).toEqual({ attachmentId: 'att-1', disposition: 'inline' });
  });

  it('sin póliza muestra el vacío con «Cargar póliza»', () => {
    insurance.result = ok({ carId: 'c-1', current: null, history: [] });
    renderTab();
    expect(screen.getByText('Sin póliza vigente')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar póliza' }));
    expect(screen.getByText('Modal cargar póliza')).toBeInTheDocument();
  });

  it('el historial de pólizas anteriores va plegado', () => {
    insurance.result = ok({
      carId: 'c-1',
      current: null,
      history: [{ ...POLICY, policyId: 'p-0', policyNumber: 'POL-OLD', status: 'expired' }],
    });
    renderTab();
    expect(screen.getByText('Pólizas anteriores (1)').closest('details')).not.toHaveAttribute('open');
  });

  it('cancelar la póliza pide el motivo y avisa qué pasa con las cuotas', () => {
    insurance.result = ok({ carId: 'c-1', current: POLICY, history: [] });
    const cancel = mutation();
    insurance.cancel = cancel;
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar póliza' }));
    expect(screen.getByText(/Las cuotas pendientes se cancelan y las ya pagas quedan/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Vendió el vehículo' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar póliza' }).at(-1) as HTMLElement);
    expect(cancel.mutate.mock.calls[0][0]).toEqual({ id: 'p-1', body: { reason: 'Vendió el vehículo' } });
  });

  it('un error del back se dice con «Reintentar» y la carga muestra su estado', () => {
    const refetch = vi.fn();
    insurance.result = failed(refetch);
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
    cleanup();
    insurance.result = loading();
    renderTab();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('si al cancelar la flota no se pudo revertir, muestra las notas como aviso', () => {
    insurance.result = ok({ carId: 'c-1', current: POLICY, history: [] });
    const cancel = mutation();
    cancel.mutate.mockImplementation((_v: unknown, options?: unknown) =>
      (options as { onSuccess: (r: unknown) => void }).onSuccess({
        fleetRevert: { reverted: false, notes: ['La tarea de seguro cambió mientras tanto'] },
      }),
    );
    insurance.cancel = cancel;
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar póliza' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Vendió' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar póliza' }).at(-1) as HTMLElement);
    expect(notifyWarn).toHaveBeenCalledWith('La tarea de seguro cambió mientras tanto');
  });
});
