import type { GridColDef } from '@mui/x-data-grid';
import { ChevronLeft, ChevronRight, ScanText } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  IdentityCell,
  KpiCard,
  LoadingState,
  PageContainer,
  PageHeader,
  ResponsiveTable,
} from '../../common/components/ui';
import { useUrlParam } from '../../hooks';
import type { DocumentReadingUsageItem } from '../../services/api/types';
import { useDocumentReadingUsage } from '../../services/queries/platformConsole';
import { formatNumber, formatUsd } from '../../utils/format';
import { currentMonth, formatMonth, shiftMonth } from './platformRules';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** `12.5` → «12,5 %» (el porcentaje ya viene calculado por la API). */
const formatPct = (value: number) => `${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`;

const ReadingState = ({ enabled }: { enabled: boolean }) => (
  <Badge label={enabled ? { text: 'Encendido', tone: 'success' } : { text: 'Apagado', tone: 'neutral' }} />
);

const columns: GridColDef<DocumentReadingUsageItem>[] = [
  {
    field: 'name',
    headerName: 'Empresa',
    flex: 1.3,
    minWidth: 200,
    sortable: false,
    renderCell: ({ row }) => <IdentityCell title={row.name} avatarName={row.name} />,
  },
  {
    field: 'enabled',
    headerName: 'Lector',
    width: 130,
    sortable: false,
    renderCell: ({ row }) => <ReadingState enabled={row.enabled} />,
  },
  {
    field: 'readings',
    headerName: 'Lecturas',
    width: 110,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => <span className="font-mono">{formatNumber(row.readings)}</span>,
  },
  {
    field: 'costUsd',
    headerName: 'Costo',
    flex: 0.8,
    minWidth: 130,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => <span className="font-mono">{formatUsd(row.costUsd)}</span>,
  },
  {
    field: 'budgetUsedPct',
    headerName: 'Del tope',
    flex: 0.9,
    minWidth: 160,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <div className="text-right">
        <p className={row.budgetUsedPct >= 100 ? 'font-semibold text-danger' : 'text-ink'}>
          {formatPct(row.budgetUsedPct)}
        </p>
        <p className="text-xs text-muted">de {formatUsd(row.monthlyBudgetUsd)}</p>
      </div>
    ),
  },
];

const UsageCard = (row: DocumentReadingUsageItem) => (
  <div className="grid gap-1">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{row.name}</p>
      <ReadingState enabled={row.enabled} />
    </div>
    <p className="text-sm text-ink-2">
      {formatNumber(row.readings)} lecturas · <span className="font-mono">{formatUsd(row.costUsd)}</span>
    </p>
    <p className={row.budgetUsedPct >= 100 ? 'text-xs font-semibold text-danger' : 'text-xs text-muted'}>
      {formatPct(row.budgetUsedPct)} del tope de {formatUsd(row.monthlyBudgetUsd)}
    </p>
  </div>
);

/**
 * Uso y costo de servicios: por ahora, el lector de documentos (`GET /v2/platform/document-reading-usage`), por mes y
 * por empresa, de mayor a menor costo. Los montos los calcula la API.
 */
export const ServiceUsage = () => {
  const thisMonth = currentMonth();
  const [month, setMonth] = useUrlParam('month', thisMonth);
  const { data, isPending, isFetching, error, refetch } = useDocumentReadingUsage(month);
  const isCurrent = month >= thisMonth;

  return (
    <PageContainer stack>
      <PageHeader
        title="Uso y costo de servicios"
        description="Lo que consume cada distribuidora de los servicios externos que paga la plataforma."
      />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mes">
        <Button
          variant="secondary"
          size="sm"
          icon={<ChevronLeft />}
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="Mes anterior"
        >
          Anterior
        </Button>
        <p className="min-w-40 text-center text-sm font-semibold text-ink" aria-live="polite">
          {capitalize(formatMonth(month))}
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={<ChevronRight />}
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={isCurrent}
          aria-label="Mes siguiente"
        >
          Siguiente
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} resource="El uso de servicios" onRetry={() => void refetch()} />
      ) : isPending ? (
        <LoadingState fullPage label="Cargando el uso…" />
      ) : (
        <>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <KpiCard
              title="Lecturas del mes"
              icon={ScanText}
              value={formatNumber(data.totalReadings)}
              hint={formatMonth(data.month)}
            />
            <KpiCard title="Costo del mes" icon={ScanText} value={formatUsd(data.totalCostUsd)} hint="En dólares" />
          </div>
          <Card>
            <div className="p-4 pb-0">
              <CardHeader
                title="Lector de documentos"
                subtitle="Por empresa, de mayor a menor costo, con el tope de gasto que tiene configurado."
              />
            </div>
            <ResponsiveTable
              rows={data.items}
              columns={columns}
              getRowId={(row) => row.distributorId}
              renderCard={UsageCard}
              label="uso del lector"
              loading={isFetching}
              empty={<EmptyState title="Sin empresas" description="No hay distribuidoras vigentes ese mes." />}
            />
          </Card>
        </>
      )}
    </PageContainer>
  );
};
