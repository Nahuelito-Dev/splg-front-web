import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok } from '../../../../test/pageTest';
import { OrderTransferReceipts } from './OrderTransferReceipts';

const state = vi.hoisted(() => ({ query: undefined as unknown }));
vi.mock('../../../../services/queries/orders', () => ({ useOrderTransferReceipts: () => state.query }));

afterEach(cleanup);

const file = (over: Record<string, unknown> = {}) => ({
  attachmentId: 'a-1',
  ownerType: 'order',
  ownerId: 'o-1',
  label: 'Comprobante de transferencia',
  originalName: 'comprobante.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1000,
  uploadedAt: '2026-10-28T15:00:00.000Z',
  url: 'https://s3.example/firmada-1',
  expiresAt: '2026-10-28T16:00:00.000Z',
  ...over,
});

describe('OrderTransferReceipts', () => {
  it('sin comprobantes avisa que el cliente todavía no subió', () => {
    state.query = ok([]);
    render(<OrderTransferReceipts orderId="o-1" />);
    expect(screen.getByText('El cliente todavía no subió el comprobante')).toBeInTheDocument();
  });

  it('sólo lista los comprobantes del cliente, no otros adjuntos del pedido', () => {
    state.query = ok([file({ attachmentId: 'a-9', label: 'Remito', originalName: 'remito.pdf' })]);
    render(<OrderTransferReceipts orderId="o-1" />);
    expect(screen.queryByText('remito.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('El cliente todavía no subió el comprobante')).toBeInTheDocument();
  });

  it('lista imagen con miniatura y PDF, ambos con enlace firmado en pestaña nueva', () => {
    state.query = ok([
      file(),
      file({
        attachmentId: 'a-2',
        originalName: 'cbte.pdf',
        mimeType: 'application/pdf',
        url: 'https://s3.example/firmada-2',
      }),
    ]);
    render(<OrderTransferReceipts orderId="o-1" />);
    expect(screen.getByRole('img', { name: 'Comprobante comprobante.jpg' })).toHaveAttribute(
      'src',
      'https://s3.example/firmada-1',
    );
    expect(screen.getByText(/^PDF ·/)).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
    const pdf = screen.getByRole('link', { name: 'Abrir cbte.pdf' });
    expect(pdf).toHaveAttribute('href', 'https://s3.example/firmada-2');
    expect(pdf).toHaveAttribute('target', '_blank');
    expect(pdf).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('si falla muestra el error y permite reintentar', () => {
    state.query = failed();
    render(<OrderTransferReceipts orderId="o-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los comprobantes');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('mientras carga no muestra el vacío', () => {
    state.query = loading();
    render(<OrderTransferReceipts orderId="o-1" />);
    expect(screen.queryByText(/todavía no subió/)).not.toBeInTheDocument();
  });
});
