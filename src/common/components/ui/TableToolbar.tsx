import type { ReactNode } from 'react';
import { Download } from 'lucide-react';
import { downloadCsv, rowsToCsv } from '../../../utils/csv';
import { toIsoDay } from '../../../utils/dates';
import { useServerExport, type ServerExport } from '../../../hooks/useServerExport';
import { FilterChips, type FilterChip } from './FilterChips';
import { MoreActionsMenu, type MenuAction } from './MoreActionsMenu';
import { SearchInput } from './SearchInput';
import { ToolbarContext } from './toolbarContext';

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
  /**
   * Selects, casillas y `DateRangeFilter`/`DayFilter`. Se dibujan en su versión de barra (40 px, la etiqueta adentro y
   * en `aria-label`, las casillas como chip): los selects y chips van antes del buscador; las fechas, después.
   */
  filters?: ReactNode;
  /** Exporte completo desde el back (CSV y Excel con todas las filas que cumplen los filtros). */
  serverExport?: ServerExport;
  /** Se exporta desde el menú «Más»: lo que la tabla muestra en ese momento (p. ej. la selección). */
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

type ToolbarProps = Props & { exportItems?: MenuAction[] };

/**
 * Barra de herramientas de un listado, en una sola fila con todos los controles de 40 px alineados arriba (un error debajo de uno no corre a los demás): filtros,
 * búsqueda que ocupa el resto, fechas y al final el menú «Más» (⋮) con la exportación. Debajo, el conteo y los filtros
 * activos. En pantallas chicas se apila.
 */
const Toolbar = ({
  search,
  filters,
  exportItems = [],
  csv,
  actions = [],
  chips = [],
  onRemoveChip,
  onClearChips,
  resultCount,
  noun = ['resultado', 'resultados'],
  children,
}: ToolbarProps) => {
  const items: MenuAction[] = [
    ...exportItems,
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

  const count = resultCount !== undefined && (
    <p className="text-sm text-muted" aria-live="polite">
      <b className="font-semibold text-ink tabular-nums">{resultCount}</b> {resultCount === 1 ? noun[0] : noun[1]}
    </p>
  );
  const activeChips = chips.length > 0 && onRemoveChip;
  const menu = items.length > 0 && <MoreActionsMenu actions={items} />;

  // Sin buscador ni filtros, la fila de controles quedaría como una banda alta con el ⋮ solo: va todo en una fila
  // compacta, con el conteo (y los chips) a la izquierda y el ⋮ a la derecha.
  if (!search && !filters) {
    if (!count && !activeChips && !menu && !children) return null;
    return (
      <div className="flex flex-col gap-3 border-b border-outline px-4 py-2" data-testid="toolbar-compact">
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            {count}
            {activeChips && <FilterChips items={chips} onRemove={onRemoveChip} onClearAll={onClearChips} />}
          </div>
          {menu && <div className="ml-auto [&_button]:h-10 [&_button]:w-10 [&_button]:rounded-[10px]">{menu}</div>}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-b border-outline p-4">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-start" data-testid="toolbar-row">
        {filters && (
          <ToolbarContext.Provider value={true}>
            <div className="contents">{filters}</div>
          </ToolbarContext.Provider>
        )}
        {search && (
          <div className="min-w-0 md:order-1 md:min-w-[200px] md:flex-1">
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
        {menu && (
          <div className="self-end md:order-3 md:ml-auto md:self-start [&_button]:h-10 [&_button]:w-10 [&_button]:rounded-[10px]">
            {menu}
          </div>
        )}
      </div>
      {(count || activeChips) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {count}
          {activeChips && <FilterChips items={chips} onRemove={onRemoveChip} onClearAll={onClearChips} />}
        </div>
      )}
      {children}
    </div>
  );
};

/** Con exporte del back: los hooks de la descarga (React Query, sesión) sólo corren en las pantallas que lo piden. */
const WithServerExport = ({ serverExport, ...props }: Props & { serverExport: ServerExport }) => (
  <Toolbar {...props} exportItems={useServerExport(serverExport)} />
);

export const TableToolbar = (props: Props) =>
  props.serverExport ? <WithServerExport {...props} serverExport={props.serverExport} /> : <Toolbar {...props} />;
