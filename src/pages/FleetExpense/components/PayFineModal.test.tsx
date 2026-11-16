import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadedReceipt } from '../../../services/api/types';

type Callbacks = { onSuccess: (result: never) => void; onError: (error: Error) => void };
const upload = vi.hoisted(() => ({ mutate: vi.fn<[unknown, unknown?], void>(), isPending: false }));
const pay = vi.hoisted(() => ({ mutate: vi.fn<[unknown, unknown?], void>(), isPending: false }));
const notifyError = vi.hoisted(() => vi.fn());

vi.mock('../../../services/queries/fleetExpense', () => ({
  useUploadFineReceipt: () => upload,
  usePayTrafficFine: () => pay,
}));
vi.mock('../../../services/queries/finance', () => ({
  useCashBoxOptions: () => ({
    data: {
      data: [
        {
          cashBoxId: 'caja-1',
          name: 'Caja central',
          kind: 'bank',
          balance: 1500,
          requiresSession: false,
          openSessionId: null,
        },
        {
          cashBoxId: 'caja-ef',
          name: 'Efectivo',
          kind: 'cash',
          balance: 200,
          requiresSession: true,
          openSessionId: null,
        },
      ],
    },
    isPending: false,
    isError: false,
  }),
}));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: notifyError, info: vi.fn(), warn: vi.fn() },
}));

import { PayFineModal } from './PayFineModal';

const FINE = {
  fineId: 'm-1',
  actNumber: 'A-0012345',
  amount: 85000,
  voluntaryPaymentAmount: 59500,
  occurredAt: '2026-09-01T15:00:00.000Z',
  paymentUrl: 'https://pagos.posadas.test/m-1',
  paymentCode: '998877',
  status: 'pending',
} as never;

const pick = (name = 'comprobante.pdf', type = 'application/pdf') => {
  const input = screen.getByLabelText('Elegir el comprobante de pago');
  fireEvent.change(input, { target: { files: [new File(['x'], name, { type })] } });
};

/** El back respondió la subida con este escaneo. */
const answerUpload = (result: UploadedReceipt) =>
  upload.mutate.mockImplementation((_vars, options) => (options as Callbacks).onSuccess(result as never));

beforeEach(() => {
  upload.mutate.mockReset();
  pay.mutate.mockReset();
  notifyError.mockReset();
});
afterEach(cleanup);

describe('PayFineModal', () => {
  it('«Pagar» abre el enlace de pago en otra pestaña y el código de pago se puede copiar', () => {
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    const link = screen.getByRole('link', { name: /Pagar/ });
    expect(link).toHaveAttribute('href', 'https://pagos.posadas.test/m-1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText('998877')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar el código de pago' })).toBeInTheDocument();
  });

  it('una multa sin enlace de pago no ofrece un enlace: el botón explica por qué', () => {
    render(
      <PayFineModal fine={{ ...(FINE as object), paymentUrl: null, paymentCode: null } as never} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole('link', { name: /Pagar/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pagar' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('el importe precargado es el voluntario sólo mientras vale: vencida, el de la multa', () => {
    const { unmount } = render(
      <PayFineModal fine={{ ...(FINE as object), dueDate: '2099-01-01' } as never} onClose={vi.fn()} />,
    );
    expect(screen.getByLabelText(/Importe pagado/)).toHaveValue(59500);
    unmount();
    render(<PayFineModal fine={{ ...(FINE as object), dueDate: '2020-01-01' } as never} onClose={vi.fn()} />);
    expect(screen.getByLabelText(/Importe pagado/)).toHaveValue(85000);
    expect(screen.queryByText(/Con pago voluntario/)).not.toBeInTheDocument();
  });

  it('no se paga más que el importe de la multa', async () => {
    answerUpload({ attachmentId: 'att-9', scan: { available: false, data: null } });
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    pick();
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'caja-1' } });
    fireEvent.change(screen.getByLabelText(/Importe pagado/), { target: { value: '90000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('No puede superar el importe de la multa')).toBeInTheDocument();
    expect(pay.mutate).not.toHaveBeenCalled();
  });

  it('al elegir el archivo se sube solo, sin botón de escanear', () => {
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    pick();
    expect(upload.mutate).toHaveBeenCalledTimes(1);
    expect(upload.mutate.mock.calls[0][0]).toMatchObject({ id: 'm-1' });
    expect(screen.getByText('Escaneando…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /escanear|\bIA\b/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Leer con IA/);
  });

  it('sin comprobante no deja guardar', () => {
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(pay.mutate).not.toHaveBeenCalled();
  });

  it('con escaneo disponible precarga el formulario, muestra los avisos y guarda recién con Guardar', async () => {
    answerUpload({
      attachmentId: 'att-1',
      scan: {
        available: true,
        data: {
          amount: '30.000,00',
          paidAt: '2026-10-20',
          operationNumber: 'OP-77',
          payee: null,
          payeeTaxId: null,
          period: null,
          confidence: 'medium',
          warnings: ['El importe no coincide con la multa'],
        },
      },
    });
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    pick();
    expect(screen.getByText(/Escaneo listo: revisá los datos/)).toBeInTheDocument();
    expect(screen.getByText('El importe no coincide con la multa')).toBeInTheDocument();
    expect(screen.getByLabelText(/Importe pagado/)).toHaveValue(30000);
    expect(screen.getByLabelText(/Número de operación/)).toHaveValue('OP-77');
    expect(pay.mutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'caja-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(pay.mutate).toHaveBeenCalledTimes(1));
    expect(pay.mutate.mock.calls[0][0]).toEqual({
      id: 'm-1',
      body: {
        attachmentId: 'att-1',
        paidAt: new Date('2026-10-20T12:00').toISOString(),
        amount: 30000,
        operationNumber: 'OP-77',
        cashBoxId: 'caja-1',
      },
    });
  });

  it('con escaneo no disponible deja cargar a mano, con el importe del pago voluntario', async () => {
    answerUpload({ attachmentId: 'att-2', scan: { available: false, data: null } });
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    pick();
    expect(screen.getByText(/Escaneo no disponible: cargá los datos/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Importe pagado/)).toHaveValue(59500);
    expect(screen.getByLabelText(/Número de operación/)).toHaveValue('');

    fireEvent.change(screen.getByLabelText(/Número de operación/), { target: { value: 'A-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Elegí la caja de la que salió el pago')).toBeInTheDocument();
    expect(pay.mutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'caja-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(pay.mutate).toHaveBeenCalledTimes(1));
    expect(pay.mutate.mock.calls[0][0]).toMatchObject({
      body: { attachmentId: 'att-2', amount: 59500, operationNumber: 'A-1', cashBoxId: 'caja-1' },
    });
  });

  it('escaneo que no pudo leer nada (available con data null) también deja cargar a mano', () => {
    answerUpload({ attachmentId: 'att-3', scan: { available: true, data: null } });
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    pick();
    expect(screen.getByText(/Escaneo no disponible: cargá los datos/)).toBeInTheDocument();
  });

  it('muestra el error del back al guardar y no se cierra', async () => {
    answerUpload({ attachmentId: 'att-4', scan: { available: false, data: null } });
    const onClose = vi.fn();
    pay.mutate.mockImplementation((_vars, options) =>
      (options as Callbacks).onError(new Error('La multa ya está paga')),
    );
    render(<PayFineModal fine={FINE} onClose={onClose} />);
    pick();
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'caja-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('rechaza un tipo de archivo que el back no acepta sin subirlo', () => {
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    pick('planilla.xlsx', 'application/vnd.ms-excel');
    expect(upload.mutate).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalled();
  });

  it('un comprobante nuevo sin datos deja el formulario inicial, sin restos del anterior', () => {
    answerUpload({
      attachmentId: 'att-1',
      scan: {
        available: true,
        data: {
          amount: '30.000,00',
          paidAt: '2026-10-20',
          operationNumber: 'OP-77',
          payee: null,
          payeeTaxId: null,
          period: null,
          confidence: 'high',
          warnings: ['Aviso viejo'],
        },
      },
    });
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    pick();
    expect(screen.getByLabelText(/Número de operación/)).toHaveValue('OP-77');
    answerUpload({
      attachmentId: 'att-2',
      scan: { available: true, data: null, warning: 'El lector tardó demasiado' },
    });
    pick('otro.pdf');
    expect(screen.getByLabelText(/Número de operación/)).toHaveValue('');
    expect(screen.getByLabelText(/Importe pagado/)).toHaveValue(59500);
    expect(screen.queryByText('Aviso viejo')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('El lector tardó demasiado');
    expect(screen.getByRole('status')).not.toHaveTextContent('Escaneo no disponible');
  });

  it('si falla la subida de un comprobante nuevo no queda guardable el anterior y se muestra el error', async () => {
    answerUpload({ attachmentId: 'att-1', scan: { available: false, data: null } });
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    pick();
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'caja-1' } });
    upload.mutate.mockImplementation((_vars, options) => (options as Callbacks).onError(new Error('Archivo inválido')));
    pick('otro.pdf');
    expect(notifyError).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(pay.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('el importe admite hasta 2 decimales', async () => {
    answerUpload({ attachmentId: 'att-1', scan: { available: false, data: null } });
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    pick();
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'caja-1' } });
    fireEvent.change(screen.getByLabelText(/Importe pagado/), { target: { value: '100.123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Hasta 2 decimales')).toBeInTheDocument();
    expect(pay.mutate).not.toHaveBeenCalled();
  });

  it('la región de estado existe desde el principio y el selector de caja muestra tipo y saldo', () => {
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('option', { name: /Caja central · Banco · \$/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Efectivo · Efectivo · \$/ })).toBeInTheDocument();
  });

  it('avisa si la caja de efectivo elegida no tiene la sesión abierta', () => {
    render(<PayFineModal fine={FINE} onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'caja-ef' } });
    expect(screen.getByText(/no tiene la sesión abierta/)).toBeInTheDocument();
  });
});
