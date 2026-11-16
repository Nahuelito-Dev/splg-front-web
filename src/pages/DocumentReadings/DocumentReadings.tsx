import type { GridColDef } from '@mui/x-data-grid';
import { FileText, ScanText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageContainer,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Select,
  StatusFilterTabs,
  TableToolbar,
} from '../../common/components/ui';
import { FROM_LIST_STATE, useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { DocumentReading } from '../../services/api/types';
import {
  useDocumentReadingSpend,
  useDocumentReadingStatusCounts,
  useDocumentReadings,
  useRunDocumentReadings,
  useSimulateDocumentReadings,
} from '../../services/queries/documentReadings';
import { useProcessConfigs } from '../../services/queries/moduleConfig';
import { formatDateTime } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { DOCUMENT_READING_STATUS, labelOf, statusOptions, statusParam } from '../../utils/statusLabels';
import { DistributorRequired } from '../Configuration/components/DistributorRequired';
import { SpendCard } from './components/SpendCard';
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABEL,
  documentTypeLabel,
  readingOwnerLabel,
  readingTitle,
  runSummary,
  simulationText,
  typeParam,
} from './documentReadingRules';

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  ...DOCUMENT_TYPES.map((value) => ({ value, label: DOCUMENT_TYPE_LABEL[value] })),
];

const documentName = readingTitle;
const readAtText = (row: DocumentReading) => formatDateTime(row.readAt ?? row.createdAt);

/** Lectura de documentos (M6): lo que el lector leyó de cada adjunto y las propuestas para revisar. */
export const DocumentReadings = () => {
  const navigate = useNavigate();
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ status: '', type: '' }, 10);
  const status = statusParam(DOCUMENT_READING_STATUS, filters.status);
  const type = typeParam(filters.type);
  const { data, isFetching, error, refetch } = useDocumentReadings(
    pagination,
    { status: status || undefined, type: type || undefined },
    { enabled: !needsDistributor },
  );
  const counts = useDocumentReadingStatusCounts({ type: type || undefined }, !needsDistributor);
  const spend = useDocumentReadingSpend({ enabled: !needsDistributor });
  const simulate = useSimulateDocumentReadings();
  const run = useRunDocumentReadings();
  const processes = useProcessConfigs({ enabled: !needsDistributor });
  /** Con la lectura automática apagada el back no lee a pedido (409): el dryRun sólo informa. */
  const automaticOff = processes.data?.find((p) => p.process === 'document_reading')?.params.enabled === 0;

  useClampPage(pagination, data?.total, setPagination);

  const goTo = (row: DocumentReading) => navigate(`/document-readings/${row.readingId}`, { state: FROM_LIST_STATE });

  const runBlocked = !canWrite
    ? writeHint
    : spend.data && !spend.data.available
      ? 'El servicio de lectura no está configurado'
      : undefined;

  const askAndRun = async (simulated: { read: number; budgetReached: number }) => {
    const text = simulationText(simulated.read, simulated.budgetReached);
    if (simulated.read === 0) {
      notify.info(text);
      return;
    }
    if (automaticOff) {
      notify.info(`${text} La lectura de documentos está apagada: encendela en Procesos automáticos para leerlos.`);
      return;
    }
    const ok = await confirm({
      title: '¿Leer los documentos pendientes?',
      text: `${text} Cada lectura suma al gasto del mes.`,
      confirmText: 'Leer ahora',
    });
    if (!ok) return;
    run.mutate(undefined, {
      onSuccess: (done) => notify.success(`Lectura terminada: ${runSummary(done)}`),
      onError: notify.error,
    });
  };

  /** Primero cuenta cuántos leería (sin gastar) y recién con la confirmación lee. */
  const readNow = () =>
    simulate.mutate(undefined, { onSuccess: (result) => void askAndRun(result), onError: notify.error });

  const columns: GridColDef<DocumentReading>[] = [
    {
      field: 'document',
      headerName: 'Documento',
      flex: 1.4,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={documentName(row)} subtitle={readingOwnerLabel(row)} icon={FileText} />
      ),
    },
    {
      field: 'type',
      headerName: 'Tipo',
      flex: 1,
      minWidth: 160,
      sortable: false,
      valueGetter: ({ row }) => documentTypeLabel(row),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 150,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(DOCUMENT_READING_STATUS, row.status)} />,
    },
    {
      field: 'date',
      headerName: 'Fecha',
      width: 170,
      sortable: false,
      valueGetter: ({ row }) => readAtText(row),
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => <RowActions rowLabel={`lectura ${documentName(row)}`} onView={() => goTo(row)} />,
    },
  ];

  const filtered = Boolean(status || type);

  return (
    <PageContainer stack>
      <PageHeader
        title="Lectura de documentos"
        description="Lo que el lector leyó de los comprobantes, pólizas, facturas y documentos del personal, y lo que propone hacer. Nada se aplica sin que lo confirmes."
        actions={
          <Button
            icon={<ScanText />}
            disabled={Boolean(runBlocked)}
            title={runBlocked}
            loading={simulate.isPending || run.isPending}
            onClick={readNow}
          >
            Leer ahora
          </Button>
        }
      />
      {needsDistributor ? (
        <DistributorRequired />
      ) : (
        <>
          <SpendCard />
          <Card>
            <StatusFilterTabs
              options={statusOptions(DOCUMENT_READING_STATUS)}
              value={status}
              onChange={(next) => setFilters({ status: next })}
              counts={counts}
              label="Filtrar lecturas por estado"
              idPrefix="document-readings"
            >
              <TableToolbar
                noun={['lectura', 'lecturas']}
                resultCount={filtered ? data?.total : undefined}
                filters={
                  <Select
                    label="Tipo de documento"
                    options={TYPE_OPTIONS}
                    value={type}
                    onChange={(e) => setFilters({ type: e.target.value })}
                  />
                }
              />
              {error ? (
                <ErrorState error={error} resource="Las lecturas" onRetry={() => void refetch()} />
              ) : (
                <ResponsiveTable
                  label="lecturas"
                  rows={data?.data ?? []}
                  columns={columns}
                  getRowId={(row) => row.readingId}
                  loading={isFetching}
                  pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
                  onRowClick={goTo}
                  empty={
                    filtered ? (
                      <EmptyState
                        illustration="search"
                        title="Sin resultados"
                        description="Probá con otro estado o tipo."
                      />
                    ) : (
                      <EmptyState
                        icon={ScanText}
                        title="Todavía no se leyó ningún documento"
                        description="Los comprobantes y documentos que se suban se leen solos si la lectura automática está prendida, o con «Leer ahora»."
                      />
                    )
                  }
                  renderCard={(row) => (
                    <>
                      <IdentityCell title={documentName(row)} subtitle={readingOwnerLabel(row)} icon={FileText} />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge label={labelOf(DOCUMENT_READING_STATUS, row.status)} />
                        <span className="text-sm text-muted">
                          {documentTypeLabel(row)} · {readAtText(row)}
                        </span>
                      </div>
                      <div>
                        <Button size="sm" variant="secondary" onClick={() => goTo(row)}>
                          Ver lectura
                        </Button>
                      </div>
                    </>
                  )}
                />
              )}
            </StatusFilterTabs>
          </Card>
        </>
      )}
    </PageContainer>
  );
};
