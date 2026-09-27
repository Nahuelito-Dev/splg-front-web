import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useState } from 'react';
import { Badge, Card, DataTable, EmptyState } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { useCustomerOrders } from '../../../../services/queries/customers';
import { formatCurrency, formatDateTime, formatShortId } from '../../../../utils/format';
import { labelOf, ORDER_STATUS } from '../../../../utils/statusLabels';
import { OrderDetailsModal } from '../../../Orders/components/OrderDetailsModal';

const COLUMNS: GridColDef<Order>[] = [
  {
    field: 'order_id',
    headerName: 'Pedido',
    flex: 1,
    minWidth: 200,
    renderCell: ({ row }) => (
      <div className="leading-tight">
        <span className="block font-mono font-semibold text-ink">{formatShortId(row.order_id)}</span>
        <span className="block text-[11.5px] text-muted">{formatDateTime(row.created_at)}</span>
      </div>
    ),
  },
  {
    field: 'items',
    headerName: 'Detalle',
    flex: 1.4,
    minWidth: 200,
    sortable: false,
    valueGetter: ({ row }) =>
      row.order_items.map((item) => `${item.quantity} × ${item.gas_cylinder?.type ?? 'producto'}`).join(', '),
  },
  {
    field: 'total_amount',
    headerName: 'Total',
    width: 120,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <span className="font-mono font-semibold text-ink">{formatCurrency(row.total_amount)}</span>
    ),
  },
  {
    field: 'status',
    headerName: 'Estado',
    width: 140,
    renderCell: ({ row }) => <Badge label={labelOf(ORDER_STATUS, row.status)} />,
  },
];

export const CustomerOrders = ({ userId }: { userId: string }) => {
  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const { data, isFetching } = useCustomerOrders(userId, pagination);
  const [selected, setSelected] = useState<Order | null>(null);
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-outline p-4">
        <h2 className="text-base font-semibold text-ink">Historial de pedidos</h2>
        {data && <span className="text-sm text-muted">{data.total} en total</span>}
      </div>
      <DataTable
        rows={data?.orders ?? []}
        columns={COLUMNS}
        getRowId={(row) => row.order_id}
        loading={isFetching}
        pagination={{
          model: pagination,
          onChange: setPagination,
          total: data?.total ?? 0,
        }}
        onRowClick={setSelected}
        empty={<EmptyState title="Todavía no hizo pedidos" />}
      />
      <OrderDetailsModal open={selected !== null} onClose={() => setSelected(null)} order={selected} />
    </Card>
  );
};
