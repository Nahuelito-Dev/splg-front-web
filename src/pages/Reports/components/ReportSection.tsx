import { Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, Card, EmptyState, ErrorState, Skeleton } from '../../../common/components/ui';
import { downloadCsv, rowsToCsv } from '../../../utils/csv';
import { ReportTable, type ReportColumn } from './ReportTable';

interface Props<T> {
  title: string;
  description: string;
  /** Nombre del archivo CSV, sin extensión. */
  fileName: string;
  rows: T[];
  columns: ReportColumn<T>[];
  getKey: (row: T) => string;
  chart: ReactNode;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Distribución del gráfico y la tabla; por defecto, una sobre la otra. */
  className?: string;
}

/** Un reporte del período: encabezado con exportación a CSV, gráfico y su tabla con totales. */
export function ReportSection<T>({
  title,
  description,
  fileName,
  rows,
  columns,
  getKey,
  chart,
  loading,
  error,
  onRetry,
  className,
}: Props<T>) {
  const handleExport = () => {
    const body = [...rows.map((row) => columns.map((col) => col.csv(row)))];
    downloadCsv(
      `${fileName}.csv`,
      rowsToCsv(
        columns.map((col) => col.header),
        body,
      ),
    );
  };

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download aria-hidden="true" className="h-3.5 w-3.5" />}
          disabled={loading || rows.length === 0}
          onClick={handleExport}
          aria-label={`Exportar ${title} a CSV`}
        >
          <span className="hidden sm:inline">CSV</span>
        </Button>
      </div>
      {loading ? (
        <div role="status" aria-label="Cargando" className="grid gap-3 p-5 pt-0">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <EmptyState title="Sin ventas en el período" description="Probá con otro rango de fechas." />
      ) : (
        <>
          <div className="px-5 pb-5">{chart}</div>
          <ReportTable caption={title} columns={columns} rows={rows} getKey={getKey} />
        </>
      )}
    </Card>
  );
}
