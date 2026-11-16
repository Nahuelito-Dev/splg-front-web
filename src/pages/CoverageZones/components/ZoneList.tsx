import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Badge, cx, DataTable, EmptyState, IconButton, Switch } from '../../../common/components/ui';
import type { CoverageZone } from '../../../services/api/types';
import { DEFAULT_ZONE_COLOR } from '../../../theme/zoneColors';
import { formatSurcharge, formatValidity } from '../coverageZoneUtils';

interface Props {
  rows: CoverageZone[];
  loading: boolean;
  selectedZoneId: string | null;
  onSelectRow: (zone: CoverageZone) => void;
  onToggleActive: (zone: CoverageZone) => void;
  /** Sin ellos no se muestran los botones (p. ej. superadmin sin distribuidora elegida). */
  onEdit?: (zone: CoverageZone) => void;
  onDelete?: (zone: CoverageZone) => void;
}

export const ZoneList = ({ rows, loading, selectedZoneId, onSelectRow, onToggleActive, onEdit, onDelete }: Props) => {
  const columns = useMemo<GridColDef<CoverageZone>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Zona',
        flex: 1.4,
        minWidth: 200,
        renderCell: ({ row }) => (
          <button
            type="button"
            onClick={() => onSelectRow(row)}
            className="flex min-w-0 items-center gap-2 text-left"
            title="Resaltar en el mapa"
          >
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: row.color ?? DEFAULT_ZONE_COLOR }}
            />
            <span className="min-w-0">
              <p
                className={cx(
                  'truncate font-medium',
                  row.coverage_zone_id === selectedZoneId ? 'text-primary-strong' : 'text-ink',
                )}
              >
                {row.name}
              </p>
              {row.label && <p className="truncate text-xs text-muted">{row.label}</p>}
            </span>
          </button>
        ),
      },
      {
        field: 'priority',
        headerName: 'Prioridad',
        width: 100,
        align: 'center',
        headerAlign: 'center',
      },
      {
        field: 'surchargeValue',
        headerName: 'Recargo',
        width: 120,
        renderCell: ({ row }) => (
          <Badge label={{ text: formatSurcharge(row.surchargeType, row.surchargeValue), tone: 'primary' }} />
        ),
      },
      {
        field: 'validFrom',
        headerName: 'Vigencia',
        flex: 1,
        minWidth: 160,
        valueGetter: ({ row }) => formatValidity(row.validFrom, row.validUntil) ?? 'Siempre',
      },
      {
        field: 'isActive',
        headerName: 'Activa',
        width: 90,
        align: 'center',
        headerAlign: 'center',
        renderCell: ({ row }) => (
          <Switch
            checked={row.isActive}
            onChange={() => onToggleActive(row)}
            label={`Zona ${row.name} ${row.isActive ? 'activa' : 'inactiva'}`}
            disabled={!onEdit}
            title={onEdit ? undefined : 'Elegí una distribuidora con «Ver como» para cambiarla'}
          />
        ),
      },
      {
        field: 'actions',
        headerName: 'Acciones',
        width: 110,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <div className="flex gap-2">
            {onEdit && <IconButton label="Editar zona" icon={<EditOutlinedIcon />} onClick={() => onEdit(row)} />}
            {onDelete && (
              <IconButton
                label="Dar de baja la zona"
                tone="danger"
                icon={<DeleteOutlineIcon />}
                onClick={() => onDelete(row)}
              />
            )}
          </div>
        ),
      },
    ],
    [selectedZoneId, onSelectRow, onToggleActive, onEdit, onDelete],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.coverage_zone_id}
      loading={loading}
      rowHeight={64}
      empty={
        <EmptyState
          title="Sin zonas"
          description="Si no cargás ninguna, se entrega a todos lados sin recargo de zona."
        />
      }
    />
  );
};
