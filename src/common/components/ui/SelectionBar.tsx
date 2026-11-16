import type { ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  /** Cuántas filas hay marcadas. Con 0 no se dibuja. */
  count: number;
  /** "pedido" / "pedidos". */
  noun: [singular: string, plural: string];
  onClear: () => void;
  /** Mientras corre el lote: muestra "Detener", que evita lanzar las filas que faltan. */
  onStop?: () => void;
  busy?: boolean;
  /** Las acciones en lote (botones del kit). */
  children: ReactNode;
}

/** Barra de acciones de una tabla con filas seleccionadas (modelo de `table-selected-action` de Minimal). */
export const SelectionBar = ({ count, noun, onClear, onStop, busy = false, children }: Props) => {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Acciones sobre la selección"
      className="flex flex-wrap items-center gap-3 border-b border-outline bg-primary-soft px-4 py-2.5"
    >
      <p className="text-sm font-medium text-primary-strong" aria-live="polite">
        {count} {count === 1 ? noun[0] : noun[1]} {count === 1 ? 'seleccionado' : 'seleccionados'}
      </p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {busy && <p className="text-sm text-primary-strong">Procesando…</p>}
      {busy && onStop ? (
        <Button variant="danger" size="sm" className="ml-auto" onClick={onStop}>
          Detener
        </Button>
      ) : (
        <Button variant="ghost" size="sm" className="ml-auto" disabled={busy} onClick={onClear}>
          Quitar selección
        </Button>
      )}
    </div>
  );
};
