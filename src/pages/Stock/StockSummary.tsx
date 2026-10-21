import type { GridColDef } from '@mui/x-data-grid';
import { AlertTriangle, ArrowLeftRight, ClipboardList, Flame, PackageCheck, Truck, Warehouse } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  KpiCard,
  PageHeader,
  ResponsiveTable,
  Skeleton,
  PageContainer,
  CardHeader,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { StockSummary as StockSummaryRow } from '../../services/api/types';
import { useStockBalances, useStockSummary, useThresholds } from '../../services/queries/stock';
import { formatNumber } from '../../utils/format';
import { lowStock, pivotByLocation, type LocationRow } from './stockMath';

const LOCATION_COLUMNS: GridColDef<LocationRow>[] = [
  {
    field: 'locationName',
    headerName: 'Ubicación',
    flex: 1.2,
    minWidth: 200,
    sortable: false,
    renderCell: ({ row }) => (
      <IdentityCell
        title={row.locationName}
        subtitle={row.locationKind === 'warehouse' ? 'Galpón' : 'Camión'}
        icon={row.locationKind === 'warehouse' ? Warehouse : Truck}
      />
    ),
  },
  { field: 'gasCylinderType', headerName: 'Garrafa', width: 130, sortable: false },
  { field: 'full', headerName: 'Llenas', width: 110, type: 'number', sortable: false },
  { field: 'empty', headerName: 'Vacías', width: 110, type: 'number', sortable: false },
  { field: 'defective', headerName: 'Defectuosas', width: 130, type: 'number', sortable: false },
];

const SUMMARY_COLUMNS: GridColDef<StockSummaryRow>[] = [
  { field: 'gasCylinderType', headerName: 'Garrafa', width: 120, sortable: false },
  {
    field: 'warehouses',
    headerName: 'En galpones',
    flex: 1,
    minWidth: 130,
    sortable: false,
    valueGetter: ({ row }) => `${row.warehouses.full} · ${row.warehouses.empty} · ${row.warehouses.defective}`,
  },
  {
    field: 'vehicles',
    headerName: 'En camiones',
    flex: 1,
    minWidth: 130,
    sortable: false,
    valueGetter: ({ row }) => `${row.vehicles.full} · ${row.vehicles.empty} · ${row.vehicles.defective}`,
  },
  { field: 'physicalFull', headerName: 'Llenas físicas', width: 120, type: 'number', sortable: false },
  { field: 'reserved', headerName: 'Reservado', width: 110, type: 'number', sortable: false },
  { field: 'sellable', headerName: 'Vendible', width: 110, type: 'number', sortable: false },
  {
    field: 'minimumFull',
    headerName: 'Mínimo',
    width: 100,
    type: 'number',
    sortable: false,
    valueGetter: ({ row }) => row.minimumFull ?? '—',
  },
];

/** Resumen de stock: lo físico por garrafa (galpones y camiones), lo vendible, lo reservado y los mínimos. */
export const StockSummary = () => {
  const navigate = useNavigate();
  const { canWrite } = usePermissions();
  const summary = useStockSummary();
  const balances = useStockBalances();
  const thresholds = useThresholds();
  const alerts = lowStock(thresholds.data ?? []);
  const totals = (summary.data ?? []).reduce(
    (acc, s) => ({
      full: acc.full + s.physicalFull,
      empty: acc.empty + s.warehouses.empty + s.vehicles.empty,
      defective: acc.defective + s.warehouses.defective + s.vehicles.defective,
      sellable: acc.sellable + s.sellable,
    }),
    { full: 0, empty: 0, defective: 0, sellable: 0 },
  );
  const kpi = (value: number) => (summary.data ? formatNumber(value) : '—');

  return (
    <PageContainer>
      <PageHeader
        title="Resumen de stock"
        description="Las garrafas que hay físicamente en galpones y camiones, y cuántas se pueden vender."
        actions={
          <>
            <Button variant="secondary" icon={<ArrowLeftRight />} onClick={() => navigate('/stock/transfers')}>
              Transferencias
            </Button>
            <Button icon={<ClipboardList />} disabled={!canWrite} onClick={() => navigate('/stock/adjustments?new=1')}>
              Nuevo ajuste
            </Button>
          </>
        }
      />

      {thresholds.isError ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
          No se pudieron consultar los mínimos de stock, así que no se puede avisar si hay stock bajo.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void thresholds.refetch()}>
            Reintentar
          </button>
        </p>
      ) : (
        alerts.length > 0 && (
          <div role="alert" className="mb-4 rounded-lg border border-warn bg-warn-soft px-4 py-3 text-sm text-ink">
            <p className="flex items-center gap-2 font-semibold text-warn">
              <AlertTriangle aria-hidden="true" className="h-4 w-4" /> Stock bajo
            </p>
            <ul className="mt-1 space-y-0.5">
              {alerts.map((t) => (
                <li key={t.thresholdId}>
                  <b>{t.gasCylinderType}</b> en {t.warehouseName}: {t.currentFull} llenas (mínimo {t.minFull})
                </li>
              ))}
            </ul>
            <Link className="mt-1 inline-block font-semibold underline" to="/stock/thresholds">
              Ajustar los mínimos
            </Link>
          </div>
        )
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Llenas físicas" icon={Flame} value={kpi(totals.full)} loading={summary.isPending} />
        <KpiCard title="Vendible" icon={PackageCheck} value={kpi(totals.sellable)} loading={summary.isPending} />
        <KpiCard title="Vacías" icon={Warehouse} value={kpi(totals.empty)} loading={summary.isPending} />
        <KpiCard title="Defectuosas" icon={AlertTriangle} value={kpi(totals.defective)} loading={summary.isPending} />
      </div>

      <Card className="mb-6">
        <div className="border-b border-outline px-4 py-3">
          <CardHeader title="Por tipo de garrafa" className="" />
          <p className="text-xs text-muted">En galpones y camiones: llenas · vacías · defectuosas.</p>
        </div>
        {summary.isError ? (
          <ErrorState error={summary.error} resource="El resumen" onRetry={() => void summary.refetch()} />
        ) : (
          <ResponsiveTable
            label="el resumen"
            rows={summary.data ?? []}
            columns={SUMMARY_COLUMNS}
            getRowId={(row) => row.gasCylinderId}
            loading={summary.isPending}
            empty={<EmptyState icon={Flame} title="Sin garrafas en el catálogo" />}
            renderCard={(row) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink">{row.gasCylinderType}</p>
                  {row.minimumFull !== null && row.physicalFull < row.minimumFull && (
                    <Badge label={{ text: 'Stock bajo', tone: 'warn' }} />
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted">Llenas físicas</dt>
                  <dd className="text-right font-mono">{row.physicalFull}</dd>
                  <dt className="text-muted">Vendible</dt>
                  <dd className="text-right font-mono">{row.sellable}</dd>
                  <dt className="text-muted">Reservado</dt>
                  <dd className="text-right font-mono">{row.reserved}</dd>
                  <dt className="text-muted">Mínimo</dt>
                  <dd className="text-right font-mono">{row.minimumFull ?? '—'}</dd>
                  <dt className="text-muted">Galpones</dt>
                  <dd className="text-right font-mono">
                    {row.warehouses.full} · {row.warehouses.empty} · {row.warehouses.defective}
                  </dd>
                  <dt className="text-muted">Camiones</dt>
                  <dd className="text-right font-mono">
                    {row.vehicles.full} · {row.vehicles.empty} · {row.vehicles.defective}
                  </dd>
                </dl>
              </div>
            )}
          />
        )}
      </Card>

      <Card>
        <CardHeader title="Por galpón y por camión" className="border-b border-outline px-4 py-3" />
        {balances.isError ? (
          <ErrorState error={balances.error} resource="Los saldos" onRetry={() => void balances.refetch()} />
        ) : balances.isPending ? (
          <div className="p-4">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <ResponsiveTable
            label="los saldos"
            rows={pivotByLocation(balances.data)}
            columns={LOCATION_COLUMNS}
            getRowId={(row) => row.rowId}
            empty={
              <EmptyState
                icon={Warehouse}
                title="Todavía no hay stock registrado"
                description="Hacé el conteo inicial de un galpón para empezar."
                action={<Button onClick={() => navigate('/stock/warehouses')}>Ir a galpones</Button>}
              />
            }
            renderCard={(row) => (
              <>
                <IdentityCell
                  title={row.locationName}
                  subtitle={`${row.locationKind === 'warehouse' ? 'Galpón' : 'Camión'} · ${row.gasCylinderType}`}
                  icon={row.locationKind === 'warehouse' ? Warehouse : Truck}
                />
                <p className="text-sm text-muted">
                  {row.full} llenas · {row.empty} vacías · {row.defective} defectuosas
                </p>
              </>
            )}
          />
        )}
      </Card>
    </PageContainer>
  );
};
