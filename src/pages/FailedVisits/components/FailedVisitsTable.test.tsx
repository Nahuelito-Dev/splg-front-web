import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FailedVisitOrder } from '../../../services/api/types';

// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: FailedVisitOrder[]; columns: GridColDef<FailedVisitOrder>[] }) => (
    <div>
      {rows.map((row) => (
        <div key={row.orderId}>
          {columns.map((column) => (
            <div key={column.field}>
              {column.renderCell?.({ row } as GridRenderCellParams<FailedVisitOrder>) ??
                String(row[column.field as keyof FailedVisitOrder] ?? '')}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import { FailedVisitsTable } from './FailedVisitsTable';

afterEach(cleanup);

const row = (over: Partial<FailedVisitOrder>): FailedVisitOrder =>
  ({
    orderId: '00000000-0000-4000-8000-000000aaa111',
    deliveryMode: 'standard',
    revisitStatus: 'proposed',
    failedVisitCount: 1,
    lastFailedAt: '2026-11-21T13:00:00Z',
    lastReason: 'customer_absent',
    lastDistanceMeters: 35,
    customerName: 'Ana Pérez',
    scheduledDate: '2026-11-26',
    timeSlotName: 'Mañana',
    windowStart: '09:00:00',
    windowEnd: '13:00:00',
    ...over,
  }) as FailedVisitOrder;

const renderTable = (rows: FailedVisitOrder[], onView = vi.fn()) =>
  render(
    <FailedVisitsTable
      rows={rows}
      total={rows.length}
      loading={false}
      pagination={{ page: 0, pageSize: 10 }}
      onPaginationChange={vi.fn()}
      filtered={false}
      onView={onView}
    />,
  );

describe('FailedVisitsTable', () => {
  it('cada renglón: cliente y pedido, motivo con la distancia, visitas y la nueva visita propuesta', () => {
    renderTable([row({})]);
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Pedido #AAA111')).toBeInTheDocument();
    expect(screen.getByText('El cliente no estaba')).toBeInTheDocument();
    expect(screen.getByText(/· a 35 m del domicilio/)).toBeInTheDocument();
    expect(screen.getByText('Propuesta al cliente')).toBeInTheDocument();
    expect(screen.getByText(/Mañana \(09:00 a 13:00\)/)).toBeInTheDocument();
  });

  it('con la decisión en el admin no muestra una fecha que nadie fijó; un express lo dice', () => {
    renderTable([
      row({ revisitStatus: 'awaiting_admin', failedVisitCount: 2, deliveryMode: 'express', lastDistanceMeters: null }),
    ]);
    expect(screen.getByText('Decidís vos')).toBeInTheDocument();
    expect(screen.getByText('Sin fecha')).toBeInTheDocument();
    expect(screen.getByText('Pedido #AAA111 · Express')).toBeInTheDocument();
    expect(screen.queryByText(/del domicilio/)).not.toBeInTheDocument();
  });

  it('un pedido cancelado o entregado muestra el estado del pedido, no «Confirmada», y sin fecha de visita', () => {
    renderTable([
      row({ orderStatus: 'cancelled', revisitStatus: 'confirmed', customerName: 'Ceci' }),
      row({ orderId: '00000000-0000-4000-8000-000000bbb222', orderStatus: 'delivered', revisitStatus: 'confirmed' }),
    ]);
    expect(screen.getByText('Pedido cancelado')).toBeInTheDocument();
    expect(screen.getByText('Entregado')).toBeInTheDocument();
    expect(screen.queryByText('Confirmada')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mañana \(09:00 a 13:00\)/)).not.toBeInTheDocument();
  });

  it('un pedido ya cerrado no tiene nueva visita; «Ver» abre el detalle', () => {
    const onView = vi.fn();
    const closed = row({ revisitStatus: null, customerName: null });
    renderTable([closed], onView);
    expect(screen.getByText('Cliente sin nombre')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver/ }));
    expect(onView).toHaveBeenCalledWith(closed);
  });
});
