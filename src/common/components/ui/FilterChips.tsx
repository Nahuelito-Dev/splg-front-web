import { X } from 'lucide-react';
import { Button } from './Button';
import { chipText, type FilterChip } from './chipText';

export type { FilterChip };

interface Props {
  items: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
  /** Cuántos resultados dejan los filtros: se muestra "N resultados" antes de los chips. */
  resultCount?: number;
}

/** Los filtros activos de un listado, uno por chip, para sacarlos de a uno o de golpe. */
export const FilterChips = ({ items, onRemove, onClearAll, resultCount }: Props) => {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtros activos">
      {resultCount !== undefined && (
        <span className="mr-1 text-sm text-muted" aria-live="polite">
          <b className="font-semibold text-ink">{resultCount}</b> {resultCount === 1 ? 'resultado' : 'resultados'}
        </span>
      )}
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1 rounded-full border border-outline bg-surface-muted py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-ink-2"
        >
          {chipText(item)}
          <button
            type="button"
            onClick={() => onRemove(item.key)}
            aria-label={`Quitar filtro: ${chipText(item)}`}
            className="grid h-[18px] w-[18px] place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
          </button>
        </span>
      ))}
      {onClearAll && (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          Limpiar todo
        </Button>
      )}
    </div>
  );
};
