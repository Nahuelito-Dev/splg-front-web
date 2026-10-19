import { Download } from 'lucide-react';
import { downloadCsv, rowsToCsv } from '../../../utils/csv';
import { toIsoDay } from '../../../utils/dates';
import { Button } from './Button';

interface Props {
  /** Nombre del archivo sin extensión; se le suma la fecha del día. */
  filename: string;
  headers: string[];
  /** Las filas a exportar (lo que se ve en la tabla, o las marcadas), ya como celdas. */
  rows: unknown[][];
  label?: string;
}

/** Descarga como CSV lo que el listado muestra en ese momento. Sin filas no hay nada que exportar. */
export const ExportCsvButton = ({ filename, headers, rows, label = 'Exportar CSV' }: Props) => (
  <Button
    variant="secondary"
    size="sm"
    icon={<Download />}
    disabled={rows.length === 0}
    onClick={() => downloadCsv(`${filename}-${toIsoDay(new Date())}.csv`, rowsToCsv(headers, rows))}
  >
    {label}
  </Button>
);
