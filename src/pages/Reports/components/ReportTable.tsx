import { Fragment, useState, type ReactNode } from 'react';
import { cx } from '../../../common/components/ui';

export interface ReportColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  /** Valor que va al CSV (sin formato de moneda, para poder sumarlo en una planilla). */
  csv: (row: T) => string | number;
  /** Total de la columna para el pie; sin esto, la celda queda vacía. */
  total?: ReactNode;
  numeric?: boolean;
  /** Oculta la columna en pantallas chicas (texto largo que no entra). */
  wide?: boolean;
}

interface Props<T> {
  caption: string;
  columns: ReportColumn<T>[];
  rows: T[];
  getKey: (row: T) => string;
  renderExpanded?: (row: T) => ReactNode;
}

/** Tabla simple de un reporte, con fila de totales. Se desplaza en horizontal si no entra. */
export function ReportTable<T>({ caption, columns, rows, getKey, renderExpanded }: Props<T>) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-y border-outline bg-surface-sunken text-xs font-medium text-muted">
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                scope="col"
                className={cx('px-3 py-2.5 sm:px-5', col.numeric && 'text-right', col.wide && 'hidden sm:table-cell')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-soft">
          {rows.map((row) => {
            const key = getKey(row);
            const open = expanded === key;
            return (
              <Fragment key={key}>
                <tr className="hover:bg-surface-hover">
                  {columns.map((col, index) => (
                    <td
                      key={col.header}
                      className={cx(
                        'px-3 py-2.5 text-ink sm:px-5',
                        col.numeric && 'text-right tabular-nums',
                        col.wide && 'hidden sm:table-cell',
                      )}
                    >
                      {index === 0 && renderExpanded ? (
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setExpanded(open ? null : key)}
                          aria-expanded={open}
                        >
                          {col.render(row)}
                        </button>
                      ) : (
                        col.render(row)
                      )}
                    </td>
                  ))}
                </tr>
                {open && renderExpanded && (
                  <tr className="bg-surface-sunken">
                    <td colSpan={columns.length} className="px-3 py-3 sm:px-5">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot className="border-t border-outline bg-surface-sunken font-semibold text-ink">
          <tr>
            {columns.map((col, i) => (
              <td
                key={col.header}
                className={cx(
                  'px-3 py-2.5 sm:px-5',
                  col.numeric && 'text-right tabular-nums',
                  col.wide && 'hidden sm:table-cell',
                )}
              >
                {i === 0 ? 'Total' : col.total}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
