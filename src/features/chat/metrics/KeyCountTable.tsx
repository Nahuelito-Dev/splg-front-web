import type { GridColDef } from '@mui/x-data-grid';
import { EmptyState, ResponsiveTable, TableToolbar } from '../../../common/components/ui';
import type { KeyCount } from '../../../services/api/types';
import { formatNumber } from '../../../utils/format';

export interface KeyCountRow extends KeyCount {
  /** Cómo se llama para una persona (el título de la respuesta guardada); la clave interna no se muestra. */
  title: string;
}

interface Props {
  rows: KeyCountRow[];
  /** Nombre de la tabla y del archivo CSV. */
  label: string;
  filename: string;
  noun: [singular: string, plural: string];
  empty: { title: string; description: string };
}

const columns: GridColDef<KeyCountRow>[] = [
  {
    field: 'title',
    headerName: 'Respuesta',
    flex: 1,
    minWidth: 160,
    sortable: false,
    renderCell: ({ row }) => <span className="truncate font-medium text-ink">{row.title}</span>,
  },
  {
    field: 'count',
    headerName: 'Usos',
    width: 100,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => <span className="tabular-nums">{formatNumber(row.count)}</span>,
  },
];

const KeyCountCard = (row: KeyCountRow) => (
  <div className="flex items-center justify-between gap-3">
    <p className="min-w-0 truncate text-sm font-medium text-ink">{row.title}</p>
    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatNumber(row.count)}</span>
  </div>
);

/** Usos por clave (respuestas guardadas del equipo), de la más usada a la menos, con exportación a CSV. */
export const KeyCountTable = ({ rows, label, filename, noun, empty }: Props) => {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  return (
    <>
      <TableToolbar
        resultCount={sorted.length}
        noun={noun}
        csv={{
          filename,
          headers: ['Respuesta', 'Usos'],
          rows: sorted.map((row) => [row.title, row.count]),
        }}
      />
      <ResponsiveTable
        rows={sorted}
        columns={columns}
        getRowId={(row) => row.key}
        renderCard={KeyCountCard}
        label={label}
        empty={<EmptyState title={empty.title} description={empty.description} />}
      />
    </>
  );
};
