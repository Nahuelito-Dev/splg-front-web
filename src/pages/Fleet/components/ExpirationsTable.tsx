import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { FleetExpirationEntry } from '../../../services/api/types';
import { formatDay } from '../../../utils/format';
import { FLEET_EXPIRATION_STATUS, FLEET_TASK_CRITICALITY, labelOf } from '../../../utils/statusLabels';

export interface ExpirationRow {
  key: string;
  /** `carId` o `deliveryId`: adónde navega "Ver ficha". */
  ownerId: string;
  title: string;
  subtitle?: string;
  isLocked: boolean;
  item: FleetExpirationEntry;
}

interface Props {
  rows: ExpirationRow[];
  identityHeader: string;
  loading: boolean;
  emptyTitle: string;
  onView: (row: ExpirationRow) => void;
}

/**
 * "Venció hace 3 días" / "Venció hoy" / "Vence hoy" / "Vence en 12 días". El "venció" sale
 * de `expirationStatus` (la API la calcula contra la fecha límite exacta, con hora), no del
 * signo de `daysUntilDue`: una tarea que vence "hoy" en un huso horario negativo (Argentina)
 * ya está `expired` para la API desde la medianoche UTC, aunque acá todavía sea de tarde. Sin
 * esto se mostraban las dos etiquetas contradictorias a la vez ("Vence hoy" + badge "Vencido").
 */
const dueLabel = (
  daysUntilDue: number | null,
  expirationStatus: FleetExpirationEntry['expirationStatus'],
): string | undefined => {
  if (daysUntilDue === null) return undefined;
  const days = Math.abs(daysUntilDue);
  const plural = days === 1 ? 'día' : 'días';
  if (expirationStatus === 'expired') return days === 0 ? 'Venció hoy' : `Venció hace ${days} ${plural}`;
  return days === 0 ? 'Vence hoy' : `Vence en ${days} ${plural}`;
};

/** La tabla de vencimientos, compartida por vehículos y choferes (CU-139). */
export const ExpirationsTable = ({ rows, identityHeader, loading, emptyTitle, onView }: Props) => {
  const columns = useMemo<GridColDef<ExpirationRow>[]>(
    () => [
      {
        field: 'title',
        headerName: identityHeader,
        flex: 1.1,
        minWidth: 190,
        renderCell: ({ row }) => <IdentityCell title={row.title} subtitle={row.subtitle} monoSubtitle />,
      },
      {
        field: 'planName',
        headerName: 'Documento',
        flex: 1,
        minWidth: 170,
        valueGetter: ({ row }) => row.item.planName,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">{row.item.planName}</span>
            <span className="mt-0.5 block">
              <Badge label={labelOf(FLEET_TASK_CRITICALITY, row.item.criticality)} variant="critical" />
            </span>
          </div>
        ),
      },
      {
        field: 'dueAt',
        headerName: 'Vence',
        width: 170,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">{formatDay(row.item.dueAt)}</span>
            <span className="block text-[11.5px] text-muted">
              {dueLabel(row.item.daysUntilDue, row.item.expirationStatus)}
            </span>
          </div>
        ),
      },
      {
        field: 'expirationStatus',
        headerName: 'Estado',
        width: 130,
        renderCell: ({ row }) => (
          <Badge label={labelOf(FLEET_EXPIRATION_STATUS, row.item.expirationStatus)} variant="critical" />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 72,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => <RowActions rowLabel={row.title} onView={() => onView(row)} />,
      },
    ],
    [identityHeader, onView],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.key}
      loading={loading}
      onRowClick={onView}
      empty={<EmptyState title={emptyTitle} />}
    />
  );
};
