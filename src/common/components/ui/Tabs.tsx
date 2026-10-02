import { useRef, type KeyboardEvent } from 'react';
import type { Tone } from '../../../utils/statusLabels';
import { cx } from './cx';
import { tabId } from './tabIds';
import { TONE_CLASSES } from './toneClasses';

export interface TabItem {
  id: string;
  label: string;
  /** `undefined`: sin contador; `null`: todavía no hay dato (cargando o con error), se muestra un guion. */
  count?: number | null;
  /** Tono del contador cuando la pestaña está activa (el mismo de `Badge`). */
  tone?: Tone;
}

interface Props {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  /** Prefijo de los ids; el panel asociado usa `tabPanelProps`. */
  idPrefix: string;
}

/** Pestañas con contador, navegables con flechas, Inicio y Fin (patrón WAI-ARIA de activación automática). */
export const Tabs = ({ items, value, onChange, label, idPrefix }: Props) => {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % items.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + items.length) % items.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    const next = items[target];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-outline px-4 pt-2.5">
      {items.map((item, index) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(node) => {
              refs.current[item.id] = node;
            }}
            id={tabId(idPrefix, item.id)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cx(
              'shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active ? 'border-b-2 border-primary text-ink' : 'border-b-2 border-transparent text-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cx(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  active && item.tone ? TONE_CLASSES[item.tone] : 'bg-surface-muted text-ink-2',
                )}
              >
                {item.count === null ? '–' : item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
