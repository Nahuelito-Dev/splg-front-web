import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotificationLogItem } from '../../../../services/api/types';

const state = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
  allowed: true,
  asked: [] as Array<string | null | undefined>,
}));
vi.mock('../../../../services/queries/notificationLog', () => ({
  useOrderNotifications: (orderId: string | null | undefined) => {
    state.asked.push(orderId);
    return state.value;
  },
}));
vi.mock('../../../../hooks', () => ({
  usePermiso: (code: string) => ({ allowed: state.allowed && code === 'auditoria.ver', known: true }),
}));

import { OrderNotifications } from './OrderNotifications';

const item = (over: Partial<NotificationLogItem> = {}): NotificationLogItem => ({
  notificationLogId: 'n1',
  createdAt: '2026-11-24T15:30:00Z',
  channel: 'push',
  type: 'ORDER_CONFIRMATION',
  recipientMasked: '***abc123',
  subject: '¡Pedido Confirmado!',
  status: 'sent',
  error: null,
  orderId: 'o1',
  distributorId: 'd1',
  ...over,
});

afterEach(() => {
  cleanup();
  state.allowed = true;
  state.asked = [];
});

describe('OrderNotifications', () => {
  it('sin el permiso de auditoría no dibuja la sección ni consulta los avisos', () => {
    state.allowed = false;
    state.value = { data: [item()], isError: true, error: new Error('403'), refetch: vi.fn() };
    const { container } = render(<OrderNotifications orderId="o1" />);
    expect(container).toBeEmptyDOMElement();
    expect(state.asked).toEqual([null]);
  });

  it('con el permiso consulta los avisos del pedido', () => {
    state.value = { data: [], isError: false };
    render(<OrderNotifications orderId="o1" />);
    expect(state.asked).toEqual(['o1']);
  });

  it('un pedido sin avisos no dibuja nada', () => {
    state.value = { data: [], isError: false };
    const { container } = render(<OrderNotifications orderId="o1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mientras carga no dibuja nada', () => {
    state.value = { data: undefined, isError: false };
    const { container } = render(<OrderNotifications orderId="o1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lista los avisos del pedido con canal, estado, destinatario enmascarado y el error si falló', () => {
    state.value = {
      data: [
        item(),
        item({
          notificationLogId: 'n2',
          channel: 'email',
          type: 'CASH_READY',
          recipientMasked: 'n***@dominio.com',
          status: 'failed',
          error: 'Resend caído',
        }),
      ],
      isError: false,
    };
    render(<OrderNotifications orderId="o1" />);
    expect(screen.getByRole('heading', { name: 'Avisos' })).toBeInTheDocument();
    expect(screen.getByText('2 avisos enviados por este pedido')).toBeInTheDocument();
    expect(screen.getByText('Pedido confirmado')).toBeInTheDocument();
    expect(screen.getByText(/\*\*\*abc123/)).toBeInTheDocument();
    expect(screen.getByText(/n\*\*\*@dominio\.com · Resend caído/)).toBeInTheDocument();
    expect(screen.getByText('Enviado')).toBeInTheDocument();
    expect(screen.getByText('Falló')).toBeInTheDocument();
  });

  it('si falla la carga lo avisa y deja reintentar', () => {
    const refetch = vi.fn();
    state.value = { data: undefined, isError: true, error: new Error('Sin conexión'), refetch };
    render(<OrderNotifications orderId="o1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los avisos del pedido');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
