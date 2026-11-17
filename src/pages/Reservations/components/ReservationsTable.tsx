import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Reserva } from '../../../services/api/types';
import { formatCurrency, formatDay, formatShortId } from '../../../utils/format';

interface Props {
  rows: Reserva[];
  loading: boolean;
  onView: (reservation: Reserva) => void;
}

/** Reservas: quién, cuándo, cuánto y si la seña está paga; el resto en el detalle. */
export const ReservationsTable = ({ rows, loading, onView }: Props) => {
  const columns = useMemo<GridColDef<Reserva>[]>(
    () => [
      {
        field: 'customerName',
        headerName: 'Cliente',
        flex: 1.4,
        minWidth: 220,
        valueGetter: ({ row }) => row.customerName ?? '',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.customerName ?? 'Sin nombre'}
            subtitle={formatShortId(row.id)}
            avatarName={row.customerName ?? '?'}
            monoSubtitle
          />
        ),
      },
      {
        field: 'scheduledDate',
        headerName: 'Agendada',
        width: 140,
        valueFormatter: ({ value }: { value: string | null }) => formatDay(value),
      },
      {
        field: 'total',
        headerName: 'Total',
        width: 150,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block tabular-nums font-semibold text-ink">{formatCurrency(row.total)}</span>
            <span className="block text-[11.5px] text-muted">seña {formatCurrency(row.depositAmount)}</span>
          </div>
        ),
      },
      {
        field: 'depositPaid',
        headerName: 'Seña',
        width: 140,
        renderCell: ({ row }) => (
          <Badge label={row.depositPaid ? { text: 'Paga', tone: 'success' } : { text: 'Pendiente', tone: 'warn' }} />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 64,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions rowLabel={`reserva de ${row.customerName ?? 'cliente'}`} onView={() => onView(row)} />
        ),
      },
    ],
    [onView],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      loading={loading}
      onRowClick={onView}
      empty={<EmptyState title="Sin reservas" description="No hay pedidos reservados pendientes." />}
    />
  );
};
