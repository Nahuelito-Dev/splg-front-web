import type { ReactNode } from 'react';
import { Download } from 'lucide-react';
import { downloadCsv, rowsToCsv } from '../../../utils/csv';
import { toIsoDay } from '../../../utils/dates';
import { FilterChips, type FilterChip } from './FilterChips';
import { MoreActionsMenu, type MenuAction } from './MoreActionsMenu';
import { SearchInput } from './SearchInput';

interface Props {
  search?: {
    label: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    /** Por qué no se puede buscar ahora. */
    title?: string;
  };
  /** Selects y `DateRangePicker`: van antes de la búsqueda, que ocupa el resto de la fila. */
  filters?: ReactNode;
  /** Se exporta desde el menú «Más»: lo que la tabla muestra en ese momento. */
  csv?: { filename: string; headers: string[]; rows: unknown[][]; label?: string };
  /** Otras acciones del menú «Más». */
  actions?: MenuAction[];
  chips?: FilterChip[];
  onRemoveChip?: (key: string) => void;
  onClearChips?: () => void;
  /** Total que dejan los filtros; sin él no se muestra el conteo. */
  resultCount?: number;
  /** Cómo se llama lo que se lista, para «N clientes» cuando no hay filtros. */
  noun?: [singular: string, plural: string];
  /** Algo propio debajo (p. ej. la barra de selección). */
  children?: ReactNode;
}

/**
 * Barra de herramientas de un listado: filtros, búsqueda que ocupa el resto y un menú «Más» (⋮) con la exportación;
 * debajo, los filtros activos o el conteo. En pantallas chicas se apila.
 */
export const TableToolbar = ({
  search,
  filters,
  csv,
  actions = [],
  chips = [],
  onRemoveChip,
  onClearChips,
  resultCount,
  noun = ['resultado', 'resultados'],
  children,
}: Props) => {
  const items: MenuAction[] = [
    ...(csv
      ? [
          {
            label: csv.label ?? 'Exportar CSV',
            icon: <Download />,
            disabled: csv.rows.length === 0,
            onClick: () => downloadCsv(`${csv.filename}-${toIsoDay(new Date())}.csv`, rowsToCsv(csv.headers, csv.rows)),
          },
        ]
      : []),
    ...actions,
  ];

  return (
    <div className="flex flex-col gap-3 border-b border-outline p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        {filters && <div className="flex flex-wrap items-end gap-2 [&>*]:w-full md:[&>*]:w-auto">{filters}</div>}
        {search && (
          <div className="min-w-0 flex-1">
            <SearchInput
              label={search.label}
              placeholder={search.placeholder}
              value={search.value}
              disabled={search.disabled}
              title={search.title}
              onChange={(e) => search.onChange(e.target.value)}
              className="sm:w-full"
            />
          </div>
        )}
        {items.length > 0 && (
          <div className="self-end md:self-auto">
            <MoreActionsMenu actions={items} />
          </div>
        )}
      </div>
      {chips.length > 0 && onRemoveChip ? (
        <FilterChips items={chips} onRemove={onRemoveChip} onClearAll={onClearChips} resultCount={resultCount} />
      ) : (
        resultCount !== undefined && (
          <p className="text-sm text-muted" aria-live="polite">
            {resultCount} {resultCount === 1 ? noun[0] : noun[1]}
          </p>
        )
      )}
      {children}
    </div>
  );
};
