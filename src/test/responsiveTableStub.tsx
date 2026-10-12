import type { ReactNode } from 'react';

interface Props<T> {
  rows: T[];
  getRowId: (row: T) => string;
  renderCard: (row: T) => ReactNode;
  label: string;
  loading?: boolean;
  empty?: ReactNode;
  pagination?: { total: number };
}

/**
 * La grilla de MUI no maqueta en jsdom (sin ancho no dibuja filas): en los tests de página se usa la vista de
 * tarjetas, que comparte las acciones y los textos con la tabla.
 */
export function ResponsiveTable<T>({ rows, getRowId, renderCard, label, loading, empty, pagination }: Props<T>) {
  if (loading && rows.length === 0) return <div role="status" aria-label={`Cargando ${label}`} />;
  if (rows.length === 0) return <>{empty}</>;
  return (
    <div>
      <ul>
        {rows.map((row) => (
          <li key={getRowId(row)}>{renderCard(row)}</li>
        ))}
      </ul>
      {pagination && <span>Total {pagination.total}</span>}
    </div>
  );
}
