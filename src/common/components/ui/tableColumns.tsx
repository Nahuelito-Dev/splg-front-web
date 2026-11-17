import type {
  GridColDef,
  GridRenderCellParams,
  GridValidRowModel,
  GridValueFormatterParams,
  GridValueGetterParams,
} from '@mui/x-data-grid';
import type { ReactNode } from 'react';
import { FittedCell } from './FittedCell';
import { RowActionsLayoutProvider } from './RowActions';

/**
 * Qué es una columna para repartir el ancho:
 * - `main`: la que dice qué es la fila; la que más crece (mínimo 240 px).
 * - `number`: cifras, de ancho fijo y a la derecha.
 * - `money`: plata, de ancho fijo (un poco más que una cifra) y a la derecha.
 * - `date`: fecha u hora, 160 px.
 * - `status`: el estado (va como insignia en la tarjeta del celular).
 * - `actions`: los botones de la fila, de ancho fijo y a la derecha.
 *
 * Sin `kind` se deduce: `field: 'actions'` → acciones, `type: 'number'` → cifra, `field: 'status'` o «Estado» →
 * estado, y la primera columna que no es nada de eso → principal.
 */
export type ColumnKind = 'main' | 'number' | 'money' | 'date' | 'status' | 'actions';

export type TableColumn<T extends GridValidRowModel> = GridColDef<T> & {
  kind?: ColumnKind;
  /**
   * En la tarjeta del celular: `true` la muestra siempre (aunque haya más de tres datos), `false` nunca. Sin marcar,
   * entran las primeras hasta completar tres.
   */
  card?: boolean;
  /**
   * Texto completo de una celda dibujada a mano, para el tooltip cuando se recorta. Sin él no hay tooltip: el valor
   * crudo (un código como `in_review`, una fecha ISO) no sirve de ayuda. Las celdas de texto plano ya muestran su
   * valor formateado.
   */
  tooltip?: (row: T) => string | undefined;
};

export const ACTIONS_COLUMN_WIDTH = 136;
export const MAIN_COLUMN_MIN_WIDTH = 240;
export const DATE_COLUMN_WIDTH = 160;
const NUMBER_WIDTH = { min: 96, max: 120, base: 112 };
const MONEY_WIDTH = { min: 120, max: 160, base: 140 };

const clamp = (value: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, value));

const guessKind = <T extends GridValidRowModel>(column: TableColumn<T>): ColumnKind | undefined => {
  if (column.kind) return column.kind;
  if (column.field === 'actions' || column.type === 'actions') return 'actions';
  if (column.type === 'number') return 'number';
  if (column.type === 'date' || column.type === 'dateTime') return 'date';
  if (column.field === 'status' || column.headerName === 'Estado') return 'status';
  return undefined;
};

/** El tipo de cada columna, con la principal resuelta (la marcada o la primera que no es otra cosa). */
export const columnKinds = <T extends GridValidRowModel>(columns: TableColumn<T>[]): (ColumnKind | undefined)[] => {
  const kinds = columns.map(guessKind);
  if (!kinds.includes('main')) {
    const first = kinds.findIndex((kind) => kind === undefined);
    if (first >= 0) kinds[first] = 'main';
  }
  return kinds;
};

/**
 * Reparte el ancho de las columnas con una sola regla para todo el panel: la principal crece más que ninguna, las
 * cifras y las fechas tienen ancho fijo, las acciones van en una columna fija a la derecha (el ojo cae siempre en la
 * misma X) y ninguna otra columna se queda con todo el sobrante.
 */
export const layoutColumns = <T extends GridValidRowModel>(columns: TableColumn<T>[]): GridColDef<T>[] => {
  const kinds = columnKinds(columns);
  return columns.map((column, index): GridColDef<T> => {
    // `kind`, `card` y `tooltip` son del panel: el DataGrid no los conoce.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { kind: _kind, card: _card, tooltip, ...base } = column;
    const kind = kinds[index];
    const fitted: GridColDef<T> = base.renderCell
      ? {
          ...base,
          renderCell: (params) => <FittedCell title={tooltip?.(params.row)}>{base.renderCell?.(params)}</FittedCell>,
        }
      : base;
    switch (kind) {
      case 'actions': {
        const width = Math.max(ACTIONS_COLUMN_WIDTH, base.width ?? 0, base.minWidth ?? 0);
        const { renderCell } = base;
        return {
          ...base,
          // En la columna cada botón tiene su lugar: el ojo cae siempre en la misma X.
          renderCell: renderCell
            ? (params) => <RowActionsLayoutProvider value="slots">{renderCell(params)}</RowActionsLayoutProvider>
            : undefined,
          flex: undefined,
          width,
          minWidth: width,
          sortable: false,
          align: 'right',
          headerAlign: 'right',
        };
      }
      case 'main':
        return {
          ...fitted,
          width: undefined,
          flex: Math.max(base.flex ?? 0, 2),
          minWidth: Math.max(base.minWidth ?? 0, MAIN_COLUMN_MIN_WIDTH),
        };
      case 'number':
      case 'money': {
        const range = kind === 'number' ? NUMBER_WIDTH : MONEY_WIDTH;
        return {
          ...fitted,
          flex: undefined,
          width: clamp(base.width ?? range.base, range),
          minWidth: range.min,
          align: 'right',
          headerAlign: 'right',
        };
      }
      case 'date':
        return { ...fitted, flex: undefined, width: DATE_COLUMN_WIDTH, minWidth: DATE_COLUMN_WIDTH };
      default:
        return base.flex ? { ...fitted, flex: Math.min(base.flex, 1) } : fitted;
    }
  });
};

/** Lo que la celda de una columna muestra para una fila, fuera de la grilla (tarjetas del celular). */
export const renderColumnValue = <T extends GridValidRowModel>(
  column: GridColDef<T>,
  row: T,
  id: string,
): ReactNode => {
  const raw: unknown = row[column.field];
  const value: unknown = column.valueGetter
    ? column.valueGetter({
        row,
        value: raw,
        field: column.field,
        id,
        colDef: column,
      } as unknown as GridValueGetterParams<T, unknown>)
    : raw;
  const formattedValue: unknown = column.valueFormatter
    ? column.valueFormatter({ id, field: column.field, value } as unknown as GridValueFormatterParams)
    : value;
  if (column.renderCell) {
    return column.renderCell({
      row,
      id,
      field: column.field,
      value,
      formattedValue,
      colDef: column,
      cellMode: 'view',
      hasFocus: false,
      tabIndex: -1,
    } as unknown as GridRenderCellParams<T>);
  }
  if (formattedValue === null || formattedValue === undefined || formattedValue === '') return '—';
  return String(formattedValue);
};
