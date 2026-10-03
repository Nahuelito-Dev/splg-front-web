import { X } from 'lucide-react';
import { Button } from './Button';

export interface FilterChip {
  key: string;
  label: string;
}

interface Props {
  items: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
}

/** Los filtros activos de un listado, uno por chip, para sacarlos de a uno o de golpe. */
export const FilterChips = ({ items, onRemove, onClearAll }: Props) => {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtros activos">
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1 rounded-full border border-outline bg-surface-muted py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-ink-2"
        >
          {item.label}
          <button
            type="button"
            onClick={() => onRemove(item.key)}
            aria-label={`Quitar filtro: ${item.label}`}
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
