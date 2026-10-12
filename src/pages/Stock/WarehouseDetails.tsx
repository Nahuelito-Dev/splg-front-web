import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { ClipboardCheck, Pencil, Star } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Badge,
  Button,
  Card,
  DetailList,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  ResponsiveTable,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import { useAdjustments, useUpdateWarehouse, useWarehouse } from '../../services/queries/stock';
import { confirm, notify } from '../../utils/notifications';
import { formatDateTime } from '../../utils/format';
import { WAREHOUSE_KIND, labelOf } from '../../utils/statusLabels';
import { InitialCountModal } from './components/InitialCountModal';
import { WarehouseFormModal } from './components/WarehouseFormModal';
import { pivotBalances, type ConditionRow } from './stockMath';

const COLUMNS: GridColDef<ConditionRow>[] = [
  { field: 'gasCylinderType', headerName: 'Garrafa', flex: 1, minWidth: 140, sortable: false },
  { field: 'full', headerName: 'Llenas', width: 120, type: 'number', sortable: false },
  { field: 'empty', headerName: 'Vacías', width: 120, type: 'number', sortable: false },
  { field: 'defective', headerName: 'Defectuosas', width: 140, type: 'number', sortable: false },
];

/** La ficha de un galpón: sus datos, el saldo por garrafa y el conteo inicial. */
export const WarehouseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/stock/warehouses');
  const { canWrite, writeHint } = usePermissions();
  const { data: warehouse, isPending, error, refetch } = useWarehouse(id);
  useCrumbLeaf(warehouse?.name, goBack);
  const update = useUpdateWarehouse();
  const [editing, setEditing] = useState(false);
  const [counting, setCounting] = useState(false);
  // El conteo inicial se hace una vez: si ya existe, se avisa. Si la consulta falla no se afirma nada: la API lo exige igual.
  const counts = useAdjustments({ page: 0, pageSize: 100 }, { reason: 'initial_count' });
  const initialCount = warehouse
    ? counts.data?.data.find((a) => a.location.locationId === warehouse.locationId)
    : undefined;

  const setDefault = async () => {
    if (!warehouse) return;
    const ok = await confirm({
      title: '¿Marcar como predeterminado?',
      text: `«${warehouse.name}» pasa a ser el galpón que usa la entrega cuando el camión no tiene stock.`,
    });
    if (!ok) return;
    update.mutate(
      { id: warehouse.warehouseId, body: { isDefault: true } },
      { onSuccess: () => notify.success('Galpón predeterminado actualizado'), onError: notify.error },
    );
  };

  const rows = warehouse ? pivotBalances(warehouse.balances) : [];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title={warehouse?.name ?? 'Ficha del galpón'}
        badges={
          warehouse && (
            <>
              {warehouse.isDefault && <Badge label={{ text: 'Predeterminado', tone: 'primary' }} />}
              <Badge
                label={warehouse.isActive ? { text: 'Activo', tone: 'success' } : { text: 'Inactivo', tone: 'neutral' }}
              />
            </>
          )
        }
        actions={
          warehouse && (
            <>
              {canWrite && warehouse.isActive && !warehouse.isDefault && (
                <Button variant="secondary" size="sm" icon={<Star />} onClick={() => void setDefault()}>
                  Marcar predeterminado
                </Button>
              )}
              {canWrite && !initialCount && warehouse.isActive && (
                <Button variant="secondary" size="sm" icon={<ClipboardCheck />} onClick={() => setCounting(true)}>
                  Conteo inicial
                </Button>
              )}
              <Button
                size="sm"
                icon={<Pencil />}
                disabled={!canWrite}
                title={writeHint}
                onClick={() => setEditing(true)}
              >
                Editar
              </Button>
            </>
          )
        }
      />
      {isPending ? (
        <DetailSkeleton />
      ) : error || !warehouse ? (
        <ErrorState error={error} resource="El galpón" onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="min-w-0 self-start p-6">
            <DetailList
              items={[
                { label: 'Código', value: warehouse.code, mono: true },
                { label: 'Tipo', value: labelOf(WAREHOUSE_KIND, warehouse.kind).text },
                { label: 'Dirección', value: warehouse.address, wide: true },
                { label: 'Creado', value: formatDateTime(warehouse.createdAt) },
                {
                  label: 'Conteo inicial',
                  value: initialCount ? (
                    <Link
                      className="font-semibold text-primary underline"
                      to={`/stock/adjustments/${initialCount.adjustmentId}`}
                    >
                      N° {initialCount.number} · {formatDateTime(initialCount.createdAt)}
                    </Link>
                  ) : counts.isError ? (
                    'No se pudo consultar'
                  ) : (
                    'Pendiente'
                  ),
                  wide: true,
                },
              ]}
            />
            <div className="mt-5 flex flex-wrap gap-2 border-t border-outline pt-5">
              <Link
                className="text-sm font-semibold text-primary underline"
                to={`/stock/movements?location=${warehouse.locationId}`}
              >
                Ver movimientos
              </Link>
            </div>
          </Card>
          <Card className="min-w-0 lg:col-span-2">
            <h2 className="border-b border-outline px-4 py-3 text-sm font-semibold text-ink">Saldos por garrafa</h2>
            <ResponsiveTable
              label="saldos"
              rows={rows}
              columns={COLUMNS}
              getRowId={(row) => row.gasCylinderId}
              empty={
                <EmptyState
                  illustration="box"
                  title="Sin saldos"
                  description="Este galpón todavía no tiene garrafas registradas. Hacé el conteo inicial."
                />
              }
              renderCard={(row) => (
                <div>
                  <p className="font-semibold text-ink">{row.gasCylinderType}</p>
                  <p className="mt-1 text-sm text-muted">
                    {row.full} llenas · {row.empty} vacías · {row.defective} defectuosas
                  </p>
                </div>
              )}
            />
          </Card>
        </div>
      )}
      {warehouse && (
        <>
          <WarehouseFormModal open={editing} onClose={() => setEditing(false)} warehouse={warehouse} />
          <InitialCountModal open={counting} onClose={() => setCounting(false)} warehouse={warehouse} />
        </>
      )}
    </div>
  );
};
